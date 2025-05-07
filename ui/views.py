from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .forms import PhotoForm
import os
import uuid
from django.conf import settings

TEMP_DIR = 'temp'

@csrf_exempt
def home(request):
    if request.method == 'POST' and request.FILES.get('image'):
        form = PhotoForm(request.POST, request.FILES)
        if form.is_valid():
            # Если уже есть старое фото в сессии, удаляем его
            if 'photo_url' in request.session:
                old_photo_url = request.session.get('photo_url')
                filename = old_photo_url.split('/')[-1]
                filepath = os.path.join(settings.MEDIA_ROOT, TEMP_DIR, filename)
                if os.path.exists(filepath):
                    os.remove(filepath)

            # Генерируем уникальное имя файла
            image = request.FILES['image']
            filename = f"{uuid.uuid4()}.{image.name.split('.')[-1]}"
            filepath = os.path.join(settings.MEDIA_ROOT, TEMP_DIR, filename)
            
            # Создаём папку temp, если её нет
            os.makedirs(os.path.join(settings.MEDIA_ROOT, 'temp'), exist_ok=True)
            
            # Сохраняем файл во временную папку
            with open(filepath, 'wb+') as destination:
                for chunk in image.chunks():
                    destination.write(chunk)
            
            # Сохраняем относительный URL в сессии
            image_url = f"{settings.MEDIA_URL}{TEMP_DIR}/{filename}"
            request.session['photo_url'] = image_url
            
            return JsonResponse({'image_url': image_url})
        return JsonResponse({'error': form.errors.as_json()}, status=400)
    
    # При GET-запросе очищаем сессию
    if 'photo_url' in request.session:
        # Опционально: удаляем временный файл
        photo_url = request.session.get('photo_url')
        filename = photo_url.split('/')[-1]  # Извлекаем имя файла
        filepath = os.path.join(settings.MEDIA_ROOT, TEMP_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)  # Удаляем файл
        del request.session['photo_url']  # Удаляем ключ из сессии
    
    return render(request, 'home.html', {'photo_url': None})