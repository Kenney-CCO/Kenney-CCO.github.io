document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("modelsContainer");
    const contentSection = document.getElementById("content");
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    const pageInfo = document.getElementById("pageInfo");
    const paginationControls = document.getElementById("paginationControls");

    let allModels = [];
    let filteredModels = [];
    let hasFetchedModels = false;
    let currentPage = 1;
    const modelsPerPage = 12; // Adjust the number of models per page

    async function fetchModels() {
        if (hasFetchedModels) return;
        hasFetchedModels = true;

        console.log("🔍 Fetching available asset packs...");

        const possiblePacks = [
            "kenney_3d-road-tiles", "kenney_blaster-kit", "kenney_brick-kit",
            "kenney_building-kit", "kenney_car-kit", "kenney_castle-kit",
            "kenney_city-kit-commercial", "kenney_city-kit-roads"
        ];
        
        let validPacks = [];

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

        for (const pack of validPacks) {
            const modelsJsonPath = `${window.location.origin}/${pack}/models/data/models.json`;

            try {
                const response = await fetch(modelsJsonPath);
                if (!response.ok) continue;

                const models = await response.json();
                allModels.push(...models);
            } catch (error) {
                console.error(`❌ Failed to fetch models.json: ${modelsJsonPath}`, error);
            }
        }

        console.log(`✅ Total models loaded: ${allModels.length}`);
        updatePagination();
    }

    function updatePagination() {
        if (filteredModels.length > modelsPerPage) {
            paginationControls.style.display = "flex";
            pageInfo.textContent = `Page ${currentPage} of ${Math.ceil(filteredModels.length / modelsPerPage)}`;
        } else {
            paginationControls.style.display = "none";
        }
        displayModels();
    }

    function displayModels() {
        container.innerHTML = "";
        if (filteredModels.length === 0) {
            console.log("⚠️ No models match the search query.");
            contentSection.style.display = "none";
            return;
        }

        contentSection.style.display = "block";
        contentSection.style.opacity = "1";

        const startIndex = (currentPage - 1) * modelsPerPage;
        const endIndex = startIndex + modelsPerPage;
        const modelsToShow = filteredModels.slice(startIndex, endIndex);

        modelsToShow.forEach(model => {
            const modelCard = document.createElement("div");
            modelCard.classList.add("model-card");

            const modelDisplay = document.createElement("div");
            modelDisplay.classList.add("model-display");

            const previewImage = document.createElement("img");
            previewImage.src = model.glb; // Using model GLB as a preview
            previewImage.alt = model.name;
            previewImage.classList.add("model-preview");

            modelDisplay.appendChild(previewImage);

            modelCard.appendChild(modelDisplay);
            container.appendChild(modelCard);
        });
    }

    searchButton.addEventListener("click", () => {
        filteredModels = allModels.filter(model => model.name.toLowerCase().includes(searchInput.value.toLowerCase()));
        currentPage = 1;
        updatePagination();
    });

    fetchModels();
});
