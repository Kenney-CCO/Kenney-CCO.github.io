async function loadConfig() { // Keep this for standalone testing, but auth.js should load it first
    if (!window.config) {
        const response = await fetch('config.json');
        window.config = await response.json();
    }
    document.querySelector('.logo').textContent = window.config.siteTitle || 'CLONE.TOOLS';
}

const grid = document.querySelector('.grid');
const popup = document.querySelector('.popup');
const popupLeft = document.querySelector('.popup-left');
const popupText = document.querySelector('.popup-text');
const searchInput = document.getElementById('search-input');
const loginBtn = document.getElementById('login-btn');
let allModels = [];
let loading = false;

async function loadModels() {
    if (loading) return;
    loading = true;
    try {
        if (!window.config) await loadConfig();
        const response = await fetch(`https://api.github.com/repos/${window.config.repoOwner}/${window.config.repoName}/contents`, {
            headers: auth.getToken() ? { 'Authorization': `token ${auth.getToken()}` } : {}
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const files = await response.json();
        const glbFiles = files.filter(f => f.name.endsWith('.glb'));
        for (const glbFile of glbFiles) {
            const baseName = glbFile.name.replace('.glb', '');
            const txtFile = files.find(f => f.name === `${baseName}.txt`);
            const pngFile = files.find(f => f.name === `${baseName}.png`);
            if (glbFile && pngFile) {
                allModels.push({
                    name: baseName,
                    glbUrl: glbFile.download_url,
                    txtUrl: txtFile ? txtFile.download_url : '',
                    pngUrl: pngFile.download_url,
                    author: window.config.creatorName,
                    authorUrl: `https://github.com/${window.config.repoOwner}`,
                    authorAvatar: window.config.creatorAvatar,
                    repoName: window.config.repoName,
                    stars: 0
                });
            }
        }
        renderGrid();
    } catch (error) {
        console.error('Error loading models:', error);
        showNotification(`Error: ${error.message}`, true);
    } finally {
        loading = false;
    }
}

function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    if (isError) notification.classList.add('error');
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 5000);
}

function renderGrid() {
    grid.innerHTML = '';
    const searchTerm = searchInput.value.toLowerCase();
    const filteredModels = allModels.filter(model => model.name.toLowerCase().includes(searchTerm));
    filteredModels.forEach(model => {
        const box = document.createElement('div');
        box.className = 'grid-box';
        box.innerHTML = `
            <img src="${model.pngUrl}" alt="${model.name}" draggable="true" class="draggable-png">
            <div class="text-row">
                <div class="name">${model.name}</div>
                <div class="stars"><span class="star-icon"></span> ${model.stars}</div>
            </div>
        `;
        box.dataset.glbUrl = model.glbUrl;
        box.dataset.txtUrl = model.txtUrl;
        box.dataset.pngUrl = model.pngUrl;
        box.dataset.name = model.name;
        box.dataset.author = model.author;
        box.dataset.authorUrl = model.authorUrl;
        box.dataset.authorAvatar = model.authorAvatar;
        box.dataset.repoName = model.repoName;
        box.dataset.stars = model.stars;
        box.addEventListener('click', showPopup);

        const img = box.querySelector('.draggable-png');
        img.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/uri-list', model.glbUrl);
            e.dataTransfer.setData('text/plain', model.glbUrl);
            e.dataTransfer.effectAllowed = 'copy';
        });

        grid.appendChild(box);
    });
}

async function showPopup(event) {
    const box = event.currentTarget;
    popup.style.display = 'flex';

    const header = document.querySelector('.popup-header');
    header.innerHTML = '';
    const leftGroup = document.createElement('div');
    leftGroup.className = 'left-button-group';
    const authorBtn = document.createElement('button');
    authorBtn.className = 'author-btn';
    const authorImg = document.createElement('img');
    authorImg.src = box.dataset.authorAvatar;
    authorBtn.appendChild(authorImg);
    authorBtn.appendChild(document.createTextNode(box.dataset.author));
    authorBtn.onclick = () => window.open(box.dataset.authorUrl, '_blank');
    leftGroup.appendChild(authorBtn);

    let creatorLinks = {};
    try {
        const linksResponse = await fetch(`https://api.github.com/repos/${window.config.repoOwner}/glbtools/contents/links.json`, {
            headers: auth.getToken() ? { 'Authorization': `token ${auth.getToken()}` } : {}
        });
        if (linksResponse.ok) {
            const linksData = await linksResponse.json();
            creatorLinks = JSON.parse(atob(linksData.content));
            if (creatorLinks.website) {
                const websiteBtn = document.createElement('button');
                websiteBtn.className = 'website-btn';
                websiteBtn.onclick = () => window.open(creatorLinks.website, '_blank');
                leftGroup.appendChild(websiteBtn);
            }
            if (creatorLinks.x) {
                const xBtn = document.createElement('button');
                xBtn.className = 'x-btn';
                xBtn.onclick = () => window.open(creatorLinks.x, '_blank');
                leftGroup.appendChild(xBtn);
            }
            if (creatorLinks.donation) {
                const donationBtn = document.createElement('button');
                donationBtn.className = 'donation-btn';
                donationBtn.textContent = 'Tip Creator';
                donationBtn.onclick = () => window.open(creatorLinks.donation, '_blank');
                leftGroup.appendChild(donationBtn);
            }
        }
    } catch (error) {
        console.log('No creator links found or error fetching:', error);
    }

    header.appendChild(leftGroup);

    const rightGroup = document.createElement('div');
    rightGroup.className = 'right-button-group';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    rightGroup.appendChild(closeBtn);
    header.appendChild(rightGroup);

    let gridReplica = document.querySelector('.popup-grid-replica');
    if (!gridReplica) {
        gridReplica = document.createElement('div');
        gridReplica.className = 'popup-grid-replica';
        popup.querySelector('.popup-right').insertBefore(gridReplica, document.querySelector('.popup-scrollbox'));
    }
    gridReplica.innerHTML = `
        <img src="${box.dataset.pngUrl}" alt="${box.dataset.name}">
        <div class="text-row">
            <div class="name">${box.dataset.name}</div>
            <span class="file-size">File Size: Fetching...</span>
            <div class="action-buttons">
                <button class="download-btn"></button>
                <button class="copy-btn"></button>
                <button class="star-btn">${box.dataset.stars}</button>
            </div>
        </div>
    `;

    popupLeft.innerHTML = `
        <div class="thumbnail-container">
            <img src="${box.dataset.pngUrl}" alt="${box.dataset.name}" class="popup-thumbnail">
            <button class="load-model-btn">Load 3D Model</button>
        </div>
    `;

    const downloadBtn = gridReplica.querySelector('.download-btn');
    const copyBtn = gridReplica.querySelector('.copy-btn');
    const starBtn = gridReplica.querySelector('.star-btn');
    const loadModelBtn = popupLeft.querySelector('.load-model-btn');
    const fileSizeSpan = gridReplica.querySelector('.file-size');
    const txtText = box.dataset.txtUrl ? await (await fetch(box.dataset.txtUrl)).text() : 'No description available.';
    popupText.textContent = txtText;

    const glbResponse = await fetch(box.dataset.glbUrl, { method: 'HEAD' });
    const fileSize = glbResponse.headers.get('Content-Length');
    fileSizeSpan.textContent = `File Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`;

    loadModelBtn.onclick = async () => {
        popupLeft.innerHTML = '<model-viewer loading="lazy" style="width: 100%; height: 100%;"></model-viewer>';
        const viewer = popupLeft.querySelector('model-viewer');
        viewer.setAttribute('src', box.dataset.glbUrl);
        viewer.setAttribute('alt', box.dataset.name);
        viewer.setAttribute('auto-rotate', '');
        viewer.setAttribute('camera-controls', '');
    };

    downloadBtn.onclick = async () => {
        const response = await fetch(box.dataset.glbUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${box.dataset.name}.glb`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification('Model downloaded!');
    };

    copyBtn.onclick = () => copyZip(box);
    closeBtn.onclick = () => {
        popup.style.display = 'none';
        popupLeft.innerHTML = '';
    };

    const token = auth.getToken();
    if (token) {
        let isStarred = false;
        try {
            const starCheck = await fetch(`https://api.github.com/user/starred/${window.config.repoOwner}/${box.dataset.repoName}`, {
                headers: { 'Authorization': `token ${token}` }
            });
            if (starCheck.status === 401) throw new Error('Token invalid or expired');
            isStarred = starCheck.status === 204;
        } catch (error) {
            console.error('Error checking star status:', error);
            starBtn.disabled = true;
        }

        starBtn.classList.toggle('starred', isStarred);
        starBtn.onclick = async () => {
            try {
                if (isStarred) {
                    await fetch(`https://api.github.com/user/starred/${window.config.repoOwner}/${box.dataset.repoName}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `token ${token}` }
                    });
                    isStarred = false;
                    starBtn.classList.remove('starred');
                    box.dataset.stars = parseInt(box.dataset.stars) - 1;
                } else {
                    await fetch(`https://api.github.com/user/starred/${window.config.repoOwner}/${box.dataset.repoName}`, {
                        method: 'PUT',
                        headers: { 'Authorization': `token ${token}` }
                    });
                    isStarred = true;
                    starBtn.classList.add('starred');
                    box.dataset.stars = parseInt(box.dataset.stars) + 1;
                }
                starBtn.textContent = box.dataset.stars;
            } catch (error) {
                console.error('Error toggling star:', error);
                showNotification('Failed to star/unstar the repository.');
            }
        };
    } else {
        starBtn.disabled = true;
    }
}

async function downloadZip(glbUrl, txtText, modelName) {
    const zip = new JSZip();
    const glbResponse = await fetch(glbUrl);
    const glbBlob = await glbResponse.blob();
    zip.file(`${modelName}.glb`, glbBlob);
    if (txtText) zip.file(`${modelName}.txt`, txtText);
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${modelName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('Model downloaded!');
}

async function copyZip(box) {
    const urls = [box.dataset.glbUrl];
    if (box.dataset.txtUrl) urls.push(box.dataset.txtUrl);
    const urlText = urls.join('\n');
    await navigator.clipboard.writeText(urlText);
    showNotification('Copied to Clipboard! Paste into your 3D app.');
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig(); // Load config first
    const logoutBtn = document.getElementById('logout-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    let dropdownVisible = false;

    document.querySelector('.load-more').addEventListener('click', loadModels);
    searchInput.addEventListener('input', renderGrid);

    loginBtn.addEventListener('click', async (e) => {
        if (loginBtn.className.includes('profile')) {
            dropdownVisible = !dropdownVisible;
            profileDropdown.style.display = dropdownVisible ? 'block' : 'none';
        } else {
            const error = await auth.loginWithGitHub();
            if (error) showNotification(`Login failed: ${error}`);
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        loginBtn.innerHTML = 'Login with GitHub';
        loginBtn.className = loginBtn.className.replace('profile', '');
        loginBtn.disabled = false;
        profileDropdown.style.display = 'none';
        dropdownVisible = false;
    });

    document.addEventListener('click', (e) => {
        if (!loginBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.style.display = 'none';
            dropdownVisible = false;
        }
    });

    auth.checkSession(async (user) => {
        if (user && auth.getToken()) {
            try {
                const response = await fetch('https://api.github.com/user', {
                    headers: { 'Authorization': `token ${auth.getToken()}` }
                });
                if (!response.ok) throw new Error('Token invalid or expired');
                auth.updateLoginDisplay(user, loginBtn);
                profileDropdown.style.display = 'none';
            } catch (error) {
                console.error('Token validation failed:', error);
                loginBtn.innerHTML = 'Login with GitHub';
                loginBtn.className = loginBtn.className.replace('profile', '');
                loginBtn.disabled = false;
            }
        } else {
            loginBtn.innerHTML = 'Login with GitHub';
            loginBtn.className = loginBtn.className.replace('profile', '');
            loginBtn.disabled = false;
        }
    });

    loadModels();
});