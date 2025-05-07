from django import forms
from django.core.exceptions import ValidationError
import os
from PIL import Image

class PhotoForm(forms.Form):
    image = forms.ImageField()

    def clean_image(self):
        image = self.cleaned_data['image']
        max_size = 5 * 1024 * 1024  # 5MB
        allowed_extensions = ['jpg']
        allowed_mime_types = ['image/jpeg']

        # Проверка размера
        if image.size > max_size:
            raise ValidationError('Максимальный размер файла: 5MB.')

        # Проверка расширения
        ext = os.path.splitext(image.name)[1].lower().lstrip('.')
        if ext not in allowed_extensions:
            raise ValidationError('Разрешны только файлы JPG.')

        # Проверка MIME-типа
        if image.content_type not in allowed_mime_types:
            raise ValidationError('Файл должен быть в формате JPG.')

        # Проверка, является ли файл действительным изображением
        try:
            img = Image.open(image)
            img.verify()  # Проверяем, что файл не повреждён
        except Exception:
            raise ValidationError('Недопустимый формат или повреждённое изображение.')

        return image