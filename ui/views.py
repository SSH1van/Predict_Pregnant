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

@csrf_exempt
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
            hcg_value = extract_hcg(photo_path, small_model_selected)

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

def extract_hcg(image_path, use_small_model=True):
    if use_small_model:
        result = reader.readtext(image_path, detail=0)
        print(result)
        return 1
        # for text in result:
        #     if any(char.isdigit() for char in text):
        #         return text
        # return "ХГЧ не обнаружен"
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
        print(output_text)
        return 1