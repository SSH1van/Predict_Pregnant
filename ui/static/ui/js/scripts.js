function uploadPhoto(event) {
  let file;
  if (event.type === "change") {
    file = event.target.files[0];
  } else if (event.type === "drop") {
    file = event.dataTransfer.files[0];
  }

  if (!file) return;

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

        // Скрываем текст и показываем изображение
        uploadText.style.display = "none";
        uploadedImage.src = data.image_url;
        uploadedImage.style.display = "block";

        // Сбрасываем поле ввода
        document.getElementById("imageInput").value = "";
      } else if (data.error) {
        alert("Ошибка загрузки фото: " + JSON.parse(data.error).image[0].message);
      }
    })
    .catch((error) => console.error("Error:", error));
}

// Поддержка drag-and-drop
const uploadButton = document.getElementById("uploadButton");
uploadButton.addEventListener("dragover", (event) => {
  event.preventDefault(); // Разрешаем drop
  event.dataTransfer.dropEffect = "move"; // Устанавливаем эффект "перемещение"
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