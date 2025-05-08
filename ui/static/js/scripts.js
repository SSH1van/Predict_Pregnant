let currentImageUrl = null;
let isModalManuallyClosed = false;

function uploadPhoto(event) {
  let file;
  if (event.type === "change") {
    file = event.target.files[0];
  } else if (event.type === "drop") {
    file = event.dataTransfer.files[0];
  }

  if (!file) return;

  // Проверка MIME-типа файла (опционально)
  if (!file.type.match("image/jpeg")) {
    alert("Пожалуйста, загрузите файл в формате JPG.");
    return;
  }

  const formData = new FormData();
  formData.append("image", file);

  fetch("", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.image_url) {
        const uploadText = document.getElementById("uploadText");
        const uploadedImage = document.getElementById("uploadedImage");
        const checkButton = document.getElementById("checkButton");

        uploadText.style.display = "none";
        uploadedImage.src = data.image_url;
        uploadedImage.style.display = "block";

        currentImageUrl = data.image_url;
        hcgInput.value = "";
        checkButton.disabled = !(
          currentImageUrl || document.getElementById("hcg-input").value
        );

        document.getElementById("imageInput").value = "";
      } else if (data.error) {
        // Универсальная обработка ошибок
        let errorMessage = "Произошла ошибка при загрузке.";
        try {
          const errorData = JSON.parse(data.error);
          if (errorData.image && errorData.image[0].message) {
            errorMessage = errorData.image[0].message;
          } else {
            errorMessage = "Недопустимый формат или повреждённое изображение.";
          }
        } catch (e) {
          errorMessage = "Не удалось обработать ошибку.";
        }
        alert(`Ошибка загрузки фото: ${errorMessage}`);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Произошла ошибка при загрузке фото.");
    });
}

// Поддержка drag-and-drop
const uploadButton = document.getElementById("uploadButton");
uploadButton.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  uploadButton.classList.add("dragover");
});

uploadButton.addEventListener("dragleave", () => {
  uploadButton.classList.remove("dragover");
});

uploadButton.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadButton.classList.remove("dragover");
  uploadPhoto(event);
});

// Функция для обновления текста времени обработки
function updateProcessingTime() {
  const hcgInputValue = hcgInput.value;
  const smallModel = document.getElementById("smallModel");
  const processingTime = document.getElementById("processingTime");

  if (hcgInputValue) {
    processingTime.textContent = "Примерное время обработки: моментально";
  } else {
    if (smallModel.checked) {
      processingTime.textContent = "Примерное время обработки: около минуты";
    } else {
      processingTime.textContent = "Примерное время обработки: около 5 минут";
    }
  }
}

// Обработчик ввода в поле HCG
const hcgInput = document.getElementById("hcg-input");
const checkButton = document.getElementById("checkButton");
const resultContainer = document.getElementById("resultContainer");
const hcgModal = document.getElementById("hcgModal");
const closeButton = document.querySelector(".close-button");
const smallModel = document.getElementById("smallModel");
const largeModel = document.getElementById("largeModel");

hcgInput.addEventListener("input", () => {
  checkButton.disabled = !(currentImageUrl || hcgInput.value);

  if (hcgInput.value && !isModalManuallyClosed) {
    hcgModal.style.display = "block";
  } else if (!hcgInput.value) {
    hcgModal.style.display = "none";
  }

  updateProcessingTime();
});

// Обработчик изменения выбора модели
smallModel.addEventListener("change", updateProcessingTime);
largeModel.addEventListener("change", updateProcessingTime);

// Закрытие модального окна по клику на крестик
closeButton.addEventListener("click", () => {
  hcgModal.style.display = "none";
  isModalManuallyClosed = true;
});

checkButton.addEventListener("click", () => {
  const smallModel = document.getElementById("smallModel");
  const largeModel = document.getElementById("largeModel");
  let selectedModel = null;

  if (smallModel.checked) {
    selectedModel = "Small Model";
  } else if (largeModel.checked) {
    selectedModel = "Large Model";
  }

  const resultText = `
    Выбранная модель: ${selectedModel}<br>
    Загруженное изображение: ${currentImageUrl || "Изображение не загружено"}
  `;

  resultContainer.innerHTML = resultText;
  resultContainer.style.display = "block";
});

// Инициализация текста времени обработки при загрузке страницы
updateProcessingTime();
