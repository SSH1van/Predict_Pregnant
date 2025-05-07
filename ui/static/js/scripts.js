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

        uploadText.style.display = "none";
        uploadedImage.src = data.image_url;
        uploadedImage.style.display = "block";

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