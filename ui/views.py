from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .forms import PhotoForm
import os
import uuid
from django.conf import settings
import easyocr
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info
import re

# Инициализация моделей
TEMP_DIR = 'temp'

# EasyOCR для маленькой модели
reader = easyocr.Reader(
    lang_list=['ru'],
    gpu=False,
    model_storage_directory=os.path.join(settings.BASE_DIR, 'models/easyocr/')
)

# Qwen2-VL для большой модели
model_path = os.path.join(settings.BASE_DIR, 'models/qwen_vl_utils')
model = Qwen2VLForConditionalGeneration.from_pretrained(
    model_path,
    torch_dtype="auto",
    device_map="auto"
)
processor = AutoProcessor.from_pretrained(model_path, use_fast=True)

def home(request):
    if request.method == 'POST':
        if request.FILES.get('image'):  # Обработка загрузки изображения
            form = PhotoForm(request.POST, request.FILES)
            if form.is_valid():
                # Удаляем старое фото, если оно есть
                if 'photo_url' in request.session:
                    old_photo_url = request.session.get('photo_url')
                    filename = old_photo_url.split('/')[-1]
                    filepath = os.path.join(settings.MEDIA_ROOT, TEMP_DIR, filename)
                    if os.path.exists(filepath):
                        os.remove(filepath)

                # Сохраняем новое фото
                image = request.FILES['image']
                filename = f"{uuid.uuid4()}.{image.name.split('.')[-1]}"
                filepath = os.path.join(settings.MEDIA_ROOT, TEMP_DIR, filename)
                os.makedirs(os.path.join(settings.MEDIA_ROOT, 'temp'), exist_ok=True)
                with open(filepath, 'wb+') as destination:
                    for chunk in image.chunks():
                        destination.write(chunk)
                
                image_url = f"{settings.MEDIA_URL}{TEMP_DIR}/{filename}"
                request.session['photo_url'] = image_url
                request.session['photo_path'] = filepath  # Сохраняем путь для последующей обработки

                return JsonResponse({'image_url': image_url})
            return JsonResponse({'error': form.errors.as_json()}, status=400)
        elif request.POST.get('action') == 'analyze':  # Обработка анализа
            photo_path = request.session.get('photo_path')
            if not photo_path or not os.path.exists(photo_path):
                return JsonResponse({'error': 'Изображение не загружено'}, status=400)

            small_model_selected = request.POST.get('modelSize') == 'small'
            hcg_value = extract_hcg_from_image(photo_path, small_model_selected)

            return JsonResponse({'hcg_value': hcg_value})
    
    # Очистка при GET-запросе
    if 'photo_url' in request.session:
        photo_url = request.session.get('photo_url')
        filename = photo_url.split('/')[-1]
        filepath = os.path.join(settings.MEDIA_ROOT, TEMP_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        del request.session['photo_url']
        if 'photo_path' in request.session:
            del request.session['photo_path']
    
    return render(request, 'home.html', {'photo_url': None})

def extract_hcg_from_image(image_path, use_small_model=True):
    if use_small_model:
        result = reader.readtext(image_path, detail=0)
        return extract_hcg_easyocr('\n'.join(result))
    else:
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image_path},
                    {"type": "text", "text": "Extract the HCG value and the unit of measurement 'МЕ/мл', 'мМЕ/мл', 'мЕд/мл', 'IU/I'"},
                ],
            }
        ]
        text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        image_inputs, video_inputs = process_vision_info(messages)
        inputs = processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        )
        inputs = inputs.to("cpu")
        generated_ids = model.generate(**inputs, max_new_tokens=256)
        generated_ids_trimmed = [
            out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]
        output_text = processor.batch_decode(
            generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
        )[0]
        return extract_hcg_qwen(output_text)

# Извлечение ХГЧ для EasyOCR
def clean_number(text):
    text = text.replace('\xa0', ' ').replace(' ', '')
    text = text.replace(',', '.')
    return text

def normalize_text(text):
    text = re.sub(r'\s+', ' ', text.replace('\xa0', ' ').strip())
    return text

def extract_hcg_easyocr(text):
    text = normalize_text(text)

    unit_patterns = [
        r'mIU/ml', r'mME/ml', r'mEd/ml', r'IU/l', r'IU/L', r'mIU/L',
        r'мЕ/мл', r'мМЕ/мл', r'мЕд/мл', r'МЕ/мл', r'IU/I', r'U/L'
    ]
    unit_pattern = '|'.join(unit_patterns)
    
    pattern = r'(?i)ХГЧ\s*(?:общий)?\s*([\d,. ]+)\s*(' + unit_pattern + r')?'
    
    match = re.search(pattern, text)
    
    if not match:
        value_pattern = r'(?i)ХГЧ\s*(?:общий)?\s*([\d,. ]+)'
        value_match = re.search(value_pattern, text)
        if value_match:
            try:
                value = float(clean_number(value_match.group(1)))
                return value
            except ValueError:
                return None
        return None
    
    try:
        value = float(clean_number(match.group(1)))
        unit = match.group(2) if match.group(2) else 'мМЕ/мл'
        
        if unit.lower() in ['iu/l', 'iu/i', 'u/l']:
            value = value * 1000
        
        return value
    except (ValueError, IndexError):
        return None
    
# Извлечение ХГЧ для Qwen2-VL
def extract_hcg_qwen(hcg_string):
    clean_string = hcg_string.replace('<|im_end|>', '').strip().replace("'", "").replace('"', '').lower()

    value_match = re.search(r'\b(\d*\.?\d+)\b', clean_string)
    if not value_match:
        return None
    value = float(value_match.group(1))

    # Сопоставление вариаций единиц измерения с основными
    unit_mapping = {
        'iu/i': 'iu/i',
        'iu/l': 'iu/i',
        'iu i': 'iu/i',
        'iu-i': 'iu/i',
        'miu/ml': 'iu/i',
        'iu/ml': 'iu/i',
        'iui': 'iu/i',
        'me/ml': 'me/ml',
        'me ml': 'me/ml',
        'meml': 'me/ml',
        'me-ml': 'me/ml',
        'me / ml': 'me/ml',
        'ме/мл': 'ме/мл',
        'ме мл': 'ме/мл',
        'мемл': 'ме/мл',
        'ме-мл': 'ме/мл',
        'ме / мл': 'ме/мл',
        'me/мл': 'ме/мл',
        'мe/мл': 'ме/мл',
        'мме/мл': 'мме/мл',
        'мме мл': 'мме/мл',
        'ммемл': 'мме/мл',
        'мме-мл': 'мме/мл',
        'мме / мл': 'мме/мл',
        'mme/мл': 'мме/мл',
        'мmе/мл': 'мме/мл',
    }

    # Поиск единицы измерения, сортировка ключей по убыванию длины
    unit = None
    for possible_unit in sorted(unit_mapping.keys(), key=len, reverse=True):
        if possible_unit in clean_string:
            unit = unit_mapping[possible_unit]
            break

    # Если единица измерения не найдена, ищем в окрестности числа
    if not unit:
        unit_match = re.search(r'\b(\w+/?\w*)\b', clean_string[value_match.end():].strip())
        if unit_match and unit_match.group(1) in unit_mapping:
            unit = unit_mapping[unit_match.group(1)]

    # Если единица измерения не найдена, считаем мМЕ/мл по умолчанию
    if not unit:
        return value

    # Конверсия в мМЕ/мл
    if unit in ['ме/мл', 'iu/i', 'me/ml']:
        return value * 1000
    return value
