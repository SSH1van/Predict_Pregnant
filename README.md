# Predict_Pregnant

## Версия Python

Python 3.13.2

## Модель Qwen2-VL-OCR-2B-Instruct

[Скачать модель model.safetensors](https://huggingface.co/prithivMLmods/Qwen2-VL-OCR-2B-Instruct/resolve/main/model.safetensors?download=true)

Скачанную модель необходимо разместить по пути:

```
models\qwen_vl_utils\model.safetensors
```

## Запуск в продакшене

Получение staticfiles

```sh
python manage.py collectstatic
```

Запуск

```sh
waitress-serve --listen=127.0.0.1:8000 Predict_Pregnant.wsgi:application
```
