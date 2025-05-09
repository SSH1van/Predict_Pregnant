let currentImageUrl = null;
let isModalManuallyClosed = false;
let currentDate = new Date();

// Таблица соотношения ХГЧ и недель беременности
const hcgRanges = [
  { week: "Небеременность", min: 0, max: 5 },
  { week: 2, min: 10, max: 50 }, // 2-3 недели
  { week: 4, min: 40, max: 1000 }, // 4 недели
  { week: 5, min: 400, max: 20700 }, // 5 недель
  { week: 6, min: 2200, max: 74200 }, // 6 недель
  { week: 7, min: 6000, max: 130000 }, // 7 недель
  { week: 8, min: 129000, max: 190000 }, // 8 недель
  { week: 9, min: 18500, max: 205000 }, // 9 недель
  { week: 10, min: 18000, max: 200000 }, // 10 недель
  { week: 11, min: 16500, max: 180000 }, // 11 недель
  { week: 12, min: 14500, max: 125000 }, // 12 недель
  { week: 13, min: 12500, max: 95000 }, // 13 недель
  { week: 14, min: 10500, max: 80000 }, // 14 недель
  { week: 15, min: 9000, max: 70000 }, // 15 недель
  { week: 16, min: 7000, max: 64000 }, // 16 недель
  { week: 17, min: 5500, max: 56000 }, // 17 недель
  { week: 18, min: 4500, max: 50000 }, // 18 недель
  { week: 19, min: 3300, max: 40000 }, // 19 недель
  { week: 20, min: 2500, max: 32000 }, // 20 недель
  { week: 21, min: 1800, max: 25000 }, // 21 неделя
];

// Функция для форматирования даты в формат ДД.ММ.ГГГГ
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

// Функция для форматирования даты в формат YYYY-MM-DD для input type="date"
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Функция для расчёта беременности по ХГЧ
function calculatePregnancy(hcgValue) {
  for (const range of hcgRanges) {
    if (hcgValue >= range.min && hcgValue <= range.max) {
      if (range.week === "Небеременность") {
        return { isPregnant: false };
      }
      const weeks = range.week;
      const months = Math.round(weeks / 4); // Примерный перевод недель в месяцы

      // Примерная дата зачатия: текущая дата - срок беременности (в неделях)
      const conceptionDate = new Date(currentDate);
      conceptionDate.setDate(currentDate.getDate() - weeks * 7);

      // Примерная дата родов: 40 недель (средний срок беременности) - текущий срок
      const dueDate = new Date(currentDate);
      const remainingWeeks = 40 - weeks;
      dueDate.setDate(currentDate.getDate() + remainingWeeks * 7);

      return {
        isPregnant: true,
        weeks: weeks,
        months: months,
        conceptionDate: formatDate(conceptionDate),
        dueDate: formatDate(dueDate),
      };
    }
  }
  // Если значение ХГЧ не попадает в диапазоны, но больше 5, всё равно считаем беременностью
  if (hcgValue > 5) {
    return {
      isPregnant: true,
      weeks: "не определено (значение ХГЧ вне стандартных диапазонов)",
      months: "не определено",
      conceptionDate: "не определено",
      dueDate: "не определено",
    };
  }
  return { isPregnant: false };
}

function uploadPhoto(event) {
  let file;
  if (event.type === "change") {
    file = event.target.files[0];
  } else if (event.type === "drop") {
    file = event.dataTransfer.files[0];
  }

  if (!file) return;

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
    .then((response) => {
      if (!response.ok) {
        throw new Error("Ошибка сети или сервера: " + response.status);
      }
      return response.json();
    })
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
        hcgModal.style.display = "none";
        updateProcessingTime();
        checkButton.disabled = !currentImageUrl;

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
      processingTime.textContent = "Примерное время обработки: около 10 секунд";
    } else {
      processingTime.textContent = "Примерное время обработки: около 2 минут";
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
const analysisDateInput = document.getElementById("analysis-date");

// Устанавливаем текущую дату в поле при загрузке страницы
analysisDateInput.value = formatDateForInput(currentDate);

// Обновление currentDate при изменении даты
analysisDateInput.addEventListener("change", () => {
  const dateValue = analysisDateInput.value; // Формат YYYY-MM-DD
  const [year, month, day] = dateValue.split("-").map(Number);
  currentDate = new Date(year, month - 1, day); // Месяцы начинаются с 0
});

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

// Обработчик кнопки "Анализ"
checkButton.addEventListener("click", () => {
  const smallModel = document.getElementById("smallModel");
  const largeModel = document.getElementById("largeModel");
  let selectedModel = null;

  if (smallModel.checked) {
    selectedModel = "Маленькая модель";
  } else if (largeModel.checked) {
    selectedModel = "Большая модель";
  }

  if (currentImageUrl) {
    const overlay = document.getElementById("overlay");
    overlay.style.display = "block";

    const formData = new FormData();
    formData.append("action", "analyze");
    formData.append("modelSize", smallModel.checked ? "small" : "large");

    fetch("", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        overlay.style.display = "none";
        if (data.hcg_value) {
          displayResult(selectedModel, data.hcg_value);
        } else if (data.error) {
          resultContainer.innerHTML = `Ошибка: ${data.error}`;
          resultContainer.style.display = "block";
        }
      })
      .catch((error) => {
        overlay.style.display = "none";
        console.error("Error:", error);
        alert("Ошибка при анализе изображения.");
      });
  } else {
    displayResult(selectedModel, hcgInput.value);
  }
});

function displayResult(selectedModel, hcgValue) {
  const resultText = `
      Выбранная модель: ${selectedModel}<br>
      Загруженное изображение: ${
        currentImageUrl || "Изображение не загружено"
      }<br>
      Дата сдачи анализов: ${formatDate(currentDate)}<br>
  `;

  if (hcgValue) {
    const pregnancyInfo = calculatePregnancy(parseFloat(hcgValue) || hcgValue);
    if (!pregnancyInfo.isPregnant) {
      resultContainer.innerHTML = resultText + "Состояние: Небеременность";
    } else {
      resultContainer.innerHTML =
        resultText +
        `
              Состояние: Беременность<br>
              Срок беременности: ${pregnancyInfo.weeks} недель (${pregnancyInfo.months} месяцев)<br>
              Примерная дата зачатия: ${pregnancyInfo.conceptionDate}<br>
              Примерная дата родов: ${pregnancyInfo.dueDate}
          `;
    }
  } else {
    resultContainer.innerHTML =
      resultText +
      "Пожалуйста, загрузите изображение или введите значение ХГЧ.";
  }
  resultContainer.style.display = "block";
}

// Инициализация текста времени обработки при загрузке страницы
updateProcessingTime();
