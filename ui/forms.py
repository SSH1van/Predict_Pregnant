from django import forms
from django.core.exceptions import ValidationError
import os

class PhotoForm(forms.Form):
    image = forms.ImageField()

    def clean_image(self):
        image = self.cleaned_data['image']
        max_size = 5 * 1024 * 1024  # 5MB
        allowed_extensions = ['jpg', 'jpeg', 'png', 'gif']

        if image.size > max_size:
            raise ValidationError('File size exceeds 5MB.')
        
        ext = os.path.splitext(image.name)[1].lower().lstrip('.')
        if ext not in allowed_extensions:
            raise ValidationError('Only JPG, JPEG, PNG, and GIF files are allowed.')
        
        return image