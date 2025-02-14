document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("modelsContainer");
    const contentSection = document.getElementById("content");
    const searchInput = document.getElementById("searchInput");

    let allModels = [];
    let hasFetchedModels = false;
    let activeCategory = null;

    async function fetchModels() {
        if (hasFetchedModels) return;
        hasFetchedModels = true;

        console.log("🔍 Fetching available asset packs...");

        const possiblePacks = [
            "kenney_3d-road-tiles", "kenney_blaster-kit", "kenney_brick-kit",
            "kenney_building-kit", "kenney_car-kit", "kenney_castle-kit",
            "kenney_city-kit-commercial", "kenney_city-kit-roads", "kenney_city-kit-suburban",
            "kenney_coaster-kit", "kenney_conveyor-kit", "kenney_fantasy-town-kit",
            "kenney_food-kit", "kenney_furniture-kit", "kenney_graveyard-kit",
            "kenney_hexagon-kit", "kenney_holiday-kit", "kenney_marble-kit",
            "kenney_mini-arcade", "kenney_mini-arena", "kenney_mini-characters",
            "kenney_mini-dungeon", "kenney_mini-market", "kenney_mini-skate",
            "kenney_minigolf-kit", "kenney_modular-buildings", "kenney_nature-kit",
            "kenney_pirate-kit", "kenney_platformer-kit", "kenney_prototype-kit",
            "kenney_racing-kit", "kenney_retro-medieval-kit", "kenney_retro-urban-kit",
            "kenney_space-kit", "kenney_space-station-kit", "kenney_survival-kit",
            "kenney_tower-defense-kit", "kenney_toy-car-kit", "kenney_train-kit",
            "kenney_watercraft-pack"
        ];

        const validPacks = [];

        for (const pack of possiblePacks) {
            const manifestPath = `${window.location.origin}/${pack}/manifest.json`;

            try {
                const response = await fetch(manifestPath);
                if (response.ok) {
                    validPacks.push(pack);
                    console.log(`✅ Found valid manifest: ${pack}`);
                }
            } catch (error) {
                console.warn(`⚠️ No manifest found for ${pack}, skipping.`);
            }
        }

        if (validPacks.length === 0) {
            console.error("❌ No valid asset packs found!");
            return;
        }

        console.log("🗂️ Valid asset packs:", validPacks);

        const fetchPromises = validPacks.map(async (pack) => {
            const manifestPath = `${window.location.origin}/${pack}/manifest.json`;

            try {
                const response = await fetch(manifestPath);
                const manifest = await response.json();

                if (!manifest.hasOwnProperty(pack)) {
                    console.error(`❌ Manifest format incorrect for ${pack}`);
                    return [];
                }

                const modelFiles = manifest[pack];  // Get the list of model files

                // Ensure modelFiles is an array before continuing
                if (!Array.isArray(modelFiles)) {
                    console.error(`❌ Invalid model list in ${pack}/manifest.json`);
                    return [];
                }

                const modelFetches = modelFiles.map(async (file) => {
                    const modelUrl = `${window.location.origin}/${pack}/models/data/${file}`;

                    try {
                        const modelResponse = await fetch(modelUrl);
                        if (!modelResponse.ok) {
                            console.warn(`⚠️ Model JSON not found: ${modelUrl}`);
                            return null;
                        }
                        const modelData = await modelResponse.json();
                        return { ...modelData, packName: pack };
                    } catch (error) {
                        console.error(`❌ Error loading model: ${modelUrl}`, error);
                        return null;
                    }
                });

                return await Promise.all(modelFetches);
            } catch (error) {
                console.error(`❌ Failed to fetch manifest: ${manifestPath}`, error);
                return [];
        }
    });

    allModels = (await Promise.all(fetchPromises)).flat().filter(Boolean);
    console.log(`✅ Total models loaded: ${allModels.length}`);

    displayModels("");
}

    function displayModels(searchQuery) {
        container.innerHTML = "";

        let filteredModels = activeCategory
            ? allModels.filter(model => model.categories.includes(activeCategory))
            : allModels.filter(model => model.name.toLowerCase().includes(searchQuery));

        if (filteredModels.length === 0) {
            console.log("No models match the search query or selected category.");
            contentSection.style.display = "none";
            return;
        }

        filteredModels.forEach(model => {
            const modelCard = document.createElement("div");
            modelCard.classList.add("model-card");

            const modelDisplay = document.createElement("div");
            modelDisplay.classList.add("model-display");

            const img = document.createElement("img");
            img.src = `${model.packName}/${model.preview}`;
            img.alt = model.name;
            img.classList.add("model-preview");
            modelDisplay.appendChild(img);

            const modelName = document.createElement("div");
            modelName.textContent = model.name;
            modelName.classList.add("model-name");

            const modelInfo = document.createElement("div");
            modelInfo.textContent = `Size: ${model.size_kb} KB - Vertices: ${model.vertices}`;
            modelInfo.classList.add("model-info");

            const categoryContainer = document.createElement("div");
            categoryContainer.classList.add("category-container");

            model.categories.forEach(category => {
                const tag = document.createElement("button");
                tag.textContent = category;
                tag.classList.add("category-tag");

                if (activeCategory === category) {
                    tag.classList.add("active");
                }

                tag.addEventListener("click", (e) => {
                    e.stopPropagation();
                    toggleCategoryFilter(category);
                });

                categoryContainer.appendChild(tag);
            });

            // "View in 3D" button
            const viewButton = document.createElement("button");
            viewButton.innerHTML = `<img src="3d.svg" alt="View in 3D" class="icon">`;
            viewButton.classList.add("view-button");

            viewButton.addEventListener("click", () => {
                modelDisplay.innerHTML = "";

                const modelViewer = document.createElement("model-viewer");
                modelViewer.setAttribute("src", `${model.packName}/${model.glb}`);
                modelViewer.setAttribute("poster", `${model.packName}/${model.preview}`);
                modelViewer.setAttribute("alt", model.name);
                modelViewer.setAttribute("camera-controls", "");
                modelViewer.style.width = "100%";
                modelViewer.style.height = "100%";

                modelDisplay.appendChild(modelViewer);
            });

            // Background button (visual only, holds the SVG)
            const dragButton = document.createElement("button");
            dragButton.classList.add("drag-button");
            dragButton.innerHTML = `<img src="drag.svg" alt="Drag" class="icon">`;
            dragButton.setAttribute("disabled", "true"); // Prevent interactions

            // Fully transparent draggable button overlay
            const dragOverlay = document.createElement("button");
            dragOverlay.classList.add("drag-overlay");
            dragOverlay.setAttribute("draggable", "true");

            // Attach drag event to the transparent overlay button
            dragOverlay.addEventListener("dragstart", (event) => {
                const fileUrl = `${window.location.origin}/${model.packName}/${model.glb}`;
                event.dataTransfer.setData("text/uri-list", fileUrl);
                event.dataTransfer.setData("text/plain", fileUrl);
            });

            // Ensure the transparent button sits perfectly over the drag button
            dragOverlay.style.position = "absolute";
            dragOverlay.style.top = "0";
            dragOverlay.style.left = "0";
            dragOverlay.style.width = "100%";
            dragOverlay.style.height = "100%";
            dragOverlay.style.background = "transparent"; // Fully transparent
            dragOverlay.style.border = "none";
            dragOverlay.style.cursor = "grab";
            dragOverlay.style.zIndex = "100"; // Ensure it's always above the background button

            // Place both buttons inside a container
            const dragContainer = document.createElement("div");
            dragContainer.style.position = "relative";
            dragContainer.style.flex = "1";
            dragContainer.style.maxWidth = "80px";
            dragContainer.style.height = "40px";
            dragContainer.style.display = "flex";
            dragContainer.style.justifyContent = "center";
            dragContainer.style.alignItems = "center";
            dragContainer.appendChild(dragButton);
            dragContainer.appendChild(dragOverlay);

            // Download button with SVG icon
            const downloadButton = document.createElement("button");
            downloadButton.classList.add("download-button");
            downloadButton.innerHTML = `<img src="download.svg" alt="Download" class="icon">`;
            downloadButton.addEventListener("click", () => {
                const link = document.createElement("a");
                link.href = `${model.packName}/${model.glb}`;
                link.download = model.glb;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });

            const buttonRow = document.createElement("div");
            buttonRow.classList.add("button-row");
            buttonRow.appendChild(viewButton);  // 3D Button on the left
            buttonRow.appendChild(dragContainer); // Drag Container (Overlay + Background)
            buttonRow.appendChild(downloadButton); // Download Button on the right

            modelCard.appendChild(modelDisplay);
            modelCard.appendChild(modelName);
            modelCard.appendChild(modelInfo);
            modelCard.appendChild(categoryContainer);
            modelCard.appendChild(buttonRow);

            container.appendChild(modelCard);
        });

        contentSection.style.display = "block";
        contentSection.style.opacity = "1";
    }

    function toggleCategoryFilter(category) {
        activeCategory = activeCategory === category ? null : category;
        searchInput.value = "";
        displayModels("");
    }

    searchInput.addEventListener("input", () => {
        if (!activeCategory) {
            displayModels(searchInput.value.toLowerCase());
        }
    });

    fetchModels();
});
