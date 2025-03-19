console.log('portal.js loaded');

const loginBtn = document.getElementById('login-btn');
const uploadForm = document.getElementById('upload-form');
const repoSelect = document.getElementById('repo-select');
const glbFileInput = document.getElementById('glb-file');
const txtFileInput = document.getElementById('txt-file');
const pngFileInput = document.getElementById('png-file');
const glbDropZone = document.getElementById('glb-drop-zone');
const txtDropZone = document.getElementById('txt-drop-zone');
const pngDropZone = document.getElementById('png-drop-zone');
const uploadStatus = document.getElementById('upload-status');
const loginMessage = document.getElementById('login-message');
const uploadSection = document.getElementById('upload-section');
const repoSection = document.getElementById('repo-section');
const modelSection = document.getElementById('model-section');
const profileSection = document.getElementById('profile-section');
const repoList = document.getElementById('repo-list');
const repoStatus = document.getElementById('repo-status');
const refreshReposBtn = document.getElementById('refresh-repos');
const newRepoNameInput = document.getElementById('new-repo-name');
const createRepoBtn = document.getElementById('create-repo-btn');
const namingRule = document.querySelector('.naming-rule');
const modelRepoSelect = document.getElementById('model-repo-select');
const modelList = document.getElementById('model-list');
const modelStatus = document.getElementById('model-status');
const enableCreatorLinksBtn = document.getElementById('enable-creator-links');
const creatorLinksDisclaimer = document.getElementById('creator-links-disclaimer');
const linksForm = document.getElementById('links-form');
const websiteLinkInput = document.getElementById('website-link');
const xLinkInput = document.getElementById('x-link');
const donationLinkInput = document.getElementById('donation-link');
const saveLinksBtn = document.getElementById('save-links');
const profileStatus = document.getElementById('profile-status');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const bulkToggle = document.getElementById('bulk-toggle');
let username;

async function checkSession() {
    let dropdownVisible = false;

    auth.checkSession(async (user) => {
        if (user && auth.getToken()) {
            auth.updateLoginDisplay(user, loginBtn);
            uploadSection.style.display = 'block';
            repoSection.style.display = 'block';
            modelSection.style.display = 'block';
            profileSection.style.display = 'block';
            loginMessage.style.display = 'none';
            try {
                const response = await fetch('https://api.github.com/user', {
                    headers: { 'Authorization': `token ${auth.getToken()}` }
                });
                if (!response.ok) throw new Error('Failed to fetch user');
                const userData = await response.json();
                username = userData.login;
                fetchRepos();
                fetchModelRepos();
                await setupCreatorLinks();
                updateStorageUsage(repoSelect.value); // Initial storage update
            } catch (error) {
                uploadStatus.textContent = `Error: ${error.message}`;
                uploadStatus.classList.add('error');
                console.error('User fetch error:', error);
            }
        } else {
            loginBtn.textContent = 'Login to GitHub';
            loginBtn.classList.remove('profile');
            loginBtn.disabled = false;
            uploadSection.style.display = 'none';
            repoSection.style.display = 'none';
            modelSection.style.display = 'none';
            profileSection.style.display = 'none';
            linksForm.style.display = 'none';
            enableCreatorLinksBtn.style.display = 'none';
            creatorLinksDisclaimer.style.display = 'none';
            profileDropdown.style.display = 'none';
            loginMessage.style.display = 'block';
        }
    });

    loginBtn.addEventListener('click', async () => {
        if (loginBtn.classList.contains('profile')) {
            dropdownVisible = !dropdownVisible;
            profileDropdown.style.display = dropdownVisible ? 'block' : 'none';
        } else {
            const error = await auth.loginWithGitHub();
            if (error) {
                uploadStatus.textContent = `Login failed: ${error}`;
                uploadStatus.classList.add('error');
            }
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        loginBtn.innerHTML = 'Login with GitHub';
        loginBtn.classList.remove('profile');
        loginBtn.disabled = false;
        profileDropdown.style.display = 'none';
        dropdownVisible = false;
        uploadSection.style.display = 'none';
        repoSection.style.display = 'none';
        modelSection.style.display = 'none';
        profileSection.style.display = 'none';
        linksForm.style.display = 'none';
        enableCreatorLinksBtn.style.display = 'none';
        creatorLinksDisclaimer.style.display = 'none';
        loginMessage.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
        if (!loginBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.style.display = 'none';
            dropdownVisible = false;
        }
    });
}

async function updateStorageUsage(repoName) {
    if (!repoName || !auth.getToken()) {
        document.getElementById('usage').textContent = '0 GB';
        document.getElementById('progress-bar').style.width = '0%';
        return;
    }
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch repo contents');
        const contents = await response.json();
        let totalSize = 0;
        for (const file of contents) {
            if (file.size) totalSize += file.size; // Size in bytes
        }
        const sizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2); // Convert to GB
        const percentage = (sizeGB / 5) * 100; // 5GB recommended cap
        document.getElementById('usage').textContent = `${sizeGB} GB`;
        document.getElementById('progress-bar').style.width = `${Math.min(percentage, 100)}%`;
    } catch (error) {
        console.error('Error fetching storage usage:', error);
        document.getElementById('usage').textContent = 'Error';
    }
}

async function setupCreatorLinks() {
    try {
        const repoResponse = await fetch(`https://api.github.com/repos/${username}/glbtools`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (repoResponse.ok) {
            const linksResponse = await fetch(`https://api.github.com/repos/${username}/glbtools/contents/links.json`, {
                headers: { 'Authorization': `token ${auth.getToken()}` }
            });
            if (linksResponse.ok) {
                const data = await linksResponse.json();
                const links = JSON.parse(atob(data.content));
                websiteLinkInput.value = links.website || '';
                xLinkInput.value = links.x || '';
                donationLinkInput.value = links.donation || '';
            }
            linksForm.style.display = 'block';
            enableCreatorLinksBtn.style.display = 'none';
            creatorLinksDisclaimer.style.display = 'none';
        } else if (repoResponse.status === 404) {
            enableCreatorLinksBtn.style.display = 'block';
            creatorLinksDisclaimer.style.display = 'block';
            linksForm.style.display = 'none';
        }
    } catch (error) {
        profileStatus.textContent = `Error setting up creator links: ${error.message}`;
        profileStatus.classList.add('error');
        console.error('Error setting up creator links:', error);
    }
}

enableCreatorLinksBtn.addEventListener('click', async () => {
    try {
        const repoCheck = await fetch(`https://api.github.com/repos/${username}/glbtools`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!repoCheck.ok && repoCheck.status !== 404) throw new Error('Failed to check glbtools repo');
        if (repoCheck.status === 404) {
            await createRepo('glbtools');
            profileStatus.textContent = 'glbtools repo created successfully!';
            profileStatus.classList.remove('error');
        }
        linksForm.style.display = 'block';
        enableCreatorLinksBtn.style.display = 'none';
        creatorLinksDisclaimer.style.display = 'none';
        await setupCreatorLinks();
    } catch (error) {
        profileStatus.textContent = `Error setting up glbtools repo: ${error.message}`;
        profileStatus.classList.add('error');
    }
});

saveLinksBtn.addEventListener('click', async () => {
    const links = {
        website: websiteLinkInput.value.trim(),
        x: xLinkInput.value.trim(),
        donation: donationLinkInput.value.trim()
    };
    const content = btoa(JSON.stringify(links, null, 2));
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/glbtools/contents/links.json`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Update creator links', content: content })
        });
        if (!response.ok) throw new Error('Failed to save links');
        profileStatus.textContent = 'Creator links saved successfully!';
        profileStatus.classList.remove('error');
    } catch (error) {
        profileStatus.textContent = `Error saving links: ${error.message}`;
        profileStatus.classList.add('error');
    }
});

function setupDragAndDrop(input, dropZone) {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change'));
    });
    dropZone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        validateFilenames();
        if (input.files.length) {
            dropZone.textContent = input.files.length > 1 ? `${input.files.length} files` : input.files[0].name;
            dropZone.style.backgroundImage = 'none';
        } else {
            resetDropZone(dropZone);
        }
    });
}

function validateFilenames() {
    const glbFile = glbFileInput.files[0];
    const txtFile = txtFileInput.files[0];
    const pngFile = pngFileInput.files[0];
    if (!glbFile) return;
    const baseName = glbFile.name.replace('.glb', '');
    let mismatch = false;
    if (txtFile && txtFile.name !== `${baseName}.txt`) mismatch = true;
    if (pngFile && pngFile.name !== `${baseName}.png`) mismatch = true;
    namingRule.style.display = mismatch ? 'block' : 'none';
}

async function fetchRepos() {
    if (!auth.getToken()) {
        repoStatus.textContent = 'Error: No GitHub token available.';
        repoStatus.classList.add('error');
        return;
    }
    try {
        const response = await fetch('https://api.github.com/user/repos', {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch repos');
        const repos = await response.json();
        repoSelect.innerHTML = '<option value="">-- Select a repository --</option>';
        repoList.innerHTML = '';
        repos.forEach(repo => {
            if (repo.topics && repo.topics.includes('glbtools')) {
                const option = document.createElement('option');
                option.value = repo.name;
                option.textContent = repo.name;
                repoSelect.appendChild(option);

                const li = document.createElement('li');
                li.textContent = repo.name;
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'button-container';

                const renameBtn = document.createElement('button');
                renameBtn.textContent = 'Rename';
                renameBtn.className = 'rename-btn';
                renameBtn.onclick = () => renameRepo(repo.name);
                buttonContainer.appendChild(renameBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'delete-btn';
                deleteBtn.onclick = () => window.open('https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository', '_blank');
                buttonContainer.appendChild(deleteBtn);

                li.appendChild(buttonContainer);
                repoList.appendChild(li);
            }
        });
    } catch (error) {
        repoStatus.textContent = `Error: ${error.message}`;
        repoStatus.classList.add('error');
    }
}

async function fetchModelRepos() {
    if (!auth.getToken()) {
        modelStatus.textContent = 'Error: No GitHub token available.';
        modelStatus.classList.add('error');
        return;
    }
    try {
        const response = await fetch('https://api.github.com/user/repos', {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch repos');
        const repos = await response.json();
        modelRepoSelect.innerHTML = '<option value="">-- Select a repository --</option>';
        repos.forEach(repo => {
            if (repo.topics && repo.topics.includes('glbtools')) {
                const option = document.createElement('option');
                option.value = repo.name;
                option.textContent = repo.name;
                modelRepoSelect.appendChild(option);
            }
        });
    } catch (error) {
        modelStatus.textContent = `Error: ${error.message}`;
        modelStatus.classList.add('error');
    }
}

async function fetchModels(repoName) {
    if (!repoName) {
        modelList.innerHTML = '';
        return;
    }
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch repo contents');
        const contents = await response.json();
        modelList.innerHTML = '';
        const glbFiles = contents.filter(item => item.name.endsWith('.glb'));
        glbFiles.forEach(item => {
            const baseName = item.name.replace('.glb', '');
            const li = document.createElement('li');
            li.textContent = baseName;
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-container';

            const renameBtn = document.createElement('button');
            renameBtn.textContent = 'Rename';
            renameBtn.className = 'rename-btn';
            renameBtn.onclick = () => renameModelFolder(repoName, baseName);
            buttonContainer.appendChild(renameBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => deleteModelFolder(repoName, baseName);
            buttonContainer.appendChild(deleteBtn);

            li.appendChild(buttonContainer);
            modelList.appendChild(li);
        });
    } catch (error) {
        modelStatus.textContent = `Error: ${error.message}`;
        modelStatus.classList.add('error');
    }
}

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    uploadStatus.textContent = 'Uploading...';
    uploadStatus.classList.remove('error');
    const repoName = repoSelect.value;
    const isBulk = bulkToggle.checked;

    if (!repoName) {
        uploadStatus.textContent = 'Please select a repository.';
        uploadStatus.classList.add('error');
        return;
    }

    if (isBulk) {
        const glbFiles = document.getElementById('glb-files').files;
        const txtFiles = document.getElementById('txt-files').files;
        const pngFiles = document.getElementById('png-files').files;

        if (!glbFiles.length || !pngFiles.length) {
            uploadStatus.textContent = 'Please provide at least one .glb and .png file.';
            uploadStatus.classList.add('error');
            return;
        }

        const txtMap = new Map([...txtFiles].map(f => [f.name.replace('.txt', ''), f]));
        const pngMap = new Map([...pngFiles].map(f => [f.name.replace('.png', ''), f]));
        const fileSets = [...glbFiles].map(glb => ({
            baseName: glb.name.replace('.glb', ''),
            glb,
            txt: txtMap.get(glb.name.replace('.glb', '')),
            png: pngMap.get(glb.name.replace('.glb', ''))
        })).filter(set => set.png);

        if (!fileSets.length) {
            uploadStatus.textContent = 'No valid sets found (.glb and .png required).';
            uploadStatus.classList.add('error');
            return;
        }

        for (let i = 0; i < fileSets.length; i++) {
            const set = fileSets[i];
            uploadStatus.textContent = `Uploading ${i + 1}/${fileSets.length}: ${set.baseName}...`;
            if (set.png.size > 100 * 1024) {
                uploadStatus.textContent = `Error: ${set.baseName}.png exceeds 100KB`;
                uploadStatus.classList.add('error');
                return;
            }
            try {
                await uploadFile(username, repoName, `${set.baseName}.glb`, set.glb);
                if (set.txt) await uploadFile(username, repoName, `${set.baseName}.txt`, set.txt);
                await uploadFile(username, repoName, `${set.baseName}.png`, set.png);
            } catch (error) {
                uploadStatus.textContent = `Error uploading ${set.baseName}: ${error.message}`;
                uploadStatus.classList.add('error');
                return;
            }
        }
        uploadStatus.textContent = 'Bulk upload successful!';
        updateStorageUsage(repoName);
    } else {
        const glbFile = glbFileInput.files[0];
        const txtFile = txtFileInput.files[0];
        const pngFile = pngFileInput.files[0];
        const baseName = glbFile ? glbFile.name.replace('.glb', '') : null;

        if (!glbFile || !pngFile) {
            uploadStatus.textContent = 'Please provide a .glb and .png file.';
            uploadStatus.classList.add('error');
            return;
        }
        if ((txtFile && txtFile.name !== `${baseName}.txt`) || pngFile.name !== `${baseName}.png`) {
            uploadStatus.textContent = 'Your .glb, .txt, and .png must have the same name';
            uploadStatus.classList.add('error');
            return;
        }
        if (pngFile.size > 100 * 1024) {
            uploadStatus.textContent = 'Thumbnail must be less than 100KB';
            uploadStatus.classList.add('error');
            return;
        }

        try {
            await uploadFile(username, repoName, `${baseName}.glb`, glbFile);
            if (txtFile) await uploadFile(username, repoName, `${baseName}.txt`, txtFile);
            await uploadFile(username, repoName, `${baseName}.png`, pngFile);
            uploadStatus.textContent = 'Upload successful!';
            updateStorageUsage(repoName);
        } catch (error) {
            uploadStatus.textContent = `Error: ${error.message}`;
            uploadStatus.classList.add('error');
        }
    }
    uploadForm.reset();
    resetDropZones();
});

async function createRepo(repoName) {
    try {
        const response = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: repoName, private: false })
        });
        if (!response.ok) throw new Error('Failed to create repo');
        await updateRepoTopics(username, repoName);
        if (repoName === 'glbtools') {
            profileStatus.textContent = 'glbtools repo created successfully!';
            profileStatus.classList.remove('error');
        } else {
            repoStatus.textContent = `Repository ${repoName} created! Refresh to select it.`;
            repoStatus.classList.remove('error');
            newRepoNameInput.value = '';
        }
    } catch (error) {
        const status = repoName === 'glbtools' ? profileStatus : repoStatus;
        status.textContent = `Error: ${error.message}`;
        status.classList.add('error');
    }
}

async function uploadFile(username, repoName, path, file) {
    const reader = new FileReader();
    const content = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });
    const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${path}`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Add ${path}`, content: content })
    });
    if (!response.ok) throw new Error(`Failed to upload ${path}`);
}

async function updateRepoTopics(username, repoName) {
    const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/topics`, {
        method: 'PUT',
        headers: { 
            'Authorization': `token ${auth.getToken()}`, 
            'Content-Type': 'application/json', 
            'Accept': 'application/vnd.github.mercy-preview+json' 
        },
        body: JSON.stringify({ names: ['glbtools'] })
    });
    if (!response.ok) throw new Error('Failed to tag repo');
}

async function renameRepo(oldName) {
    const newName = prompt(`Enter new name for ${oldName}:`, oldName);
    if (!newName || newName === oldName) return;
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${oldName}`, {
            method: 'PATCH',
            headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        if (!response.ok) throw new Error('Failed to rename repo');
        repoStatus.textContent = `Repository renamed to ${newName}.`;
        fetchRepos();
        fetchModelRepos();
    } catch (error) {
        repoStatus.textContent = `Error: ${error.message}`;
        repoStatus.classList.add('error');
    }
}

async function deleteModelFolder(repoName, baseName) {
    if (!confirm(`Delete model ${baseName} and its files? This cannot be undone.`)) return;
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch repo contents');
        const contents = await response.json();

        const filesToDelete = contents.filter(item => 
            item.name === `${baseName}.glb` || 
            item.name === `${baseName}.txt` || 
            item.name === `${baseName}.png`
        );

        for (const item of filesToDelete) {
            await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${item.name}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Delete ${item.name}`, sha: item.sha })
            });
        }
        modelStatus.textContent = `Model ${baseName} deleted.`;
        fetchModels(repoName);
        updateStorageUsage(repoName);
    } catch (error) {
        modelStatus.textContent = `Error: ${error.message}`;
        modelStatus.classList.add('error');
    }
}

async function renameModelFolder(repoName, oldBaseName) {
    const newBaseName = prompt(`Enter new name for ${oldBaseName}:`, oldBaseName);
    if (!newBaseName || newBaseName === oldBaseName) return;
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch repo contents');
        const contents = await response.json();

        const filesToRename = contents.filter(item => 
            item.name === `${oldBaseName}.glb` || 
            item.name === `${oldBaseName}.txt` || 
            item.name === `${oldBaseName}.png`
        );

        for (const item of filesToRename) {
            const oldPath = item.name;
            const newPath = `${newBaseName}${oldPath.substring(oldPath.lastIndexOf('.'))}`;
            const fileResponse = await fetch(item.download_url);
            const blob = await fileResponse.blob();
            const reader = new FileReader();
            const base64Content = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(blob);
            });

            await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${newPath}`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Rename ${oldPath} to ${newPath}`, content: base64Content })
            });

            await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${oldPath}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Delete ${oldPath}`, sha: item.sha })
            });
        }
        modelStatus.textContent = `Model renamed to ${newBaseName}.`;
        fetchModels(repoName);
        updateStorageUsage(repoName);
    } catch (error) {
        modelStatus.textContent = `Error: ${error.message}`;
        modelStatus.classList.add('error');
    }
}

refreshReposBtn.addEventListener('click', () => {
    fetchRepos();
    fetchModelRepos();
    updateStorageUsage(repoSelect.value);
});

createRepoBtn.addEventListener('click', () => {
    const repoName = newRepoNameInput.value.trim();
    if (!repoName) {
        repoStatus.textContent = 'Please enter a repository name.';
        repoStatus.classList.add('error');
        return;
    }
    createRepo(repoName);
});

repoSelect.addEventListener('change', () => {
    updateStorageUsage(repoSelect.value);
});

modelRepoSelect.addEventListener('change', () => {
    fetchModels(modelRepoSelect.value);
});

bulkToggle.addEventListener('change', () => {
    document.getElementById('single-upload').style.display = bulkToggle.checked ? 'none' : 'block';
    document.getElementById('bulk-upload').style.display = bulkToggle.checked ? 'block' : 'none';
});

function resetDropZones() {
    resetDropZone(glbDropZone);
    resetDropZone(txtDropZone);
    resetDropZone(pngDropZone);
    resetDropZone(document.getElementById('glb-bulk-drop-zone'));
    resetDropZone(document.getElementById('txt-bulk-drop-zone'));
    resetDropZone(document.getElementById('png-bulk-drop-zone'));
}

function resetDropZone(zone) {
    zone.textContent = '';
    zone.style.backgroundImage = "url('dragdrop.svg')";
}

setupDragAndDrop(glbFileInput, glbDropZone);
setupDragAndDrop(txtFileInput, txtDropZone);
setupDragAndDrop(pngFileInput, pngDropZone);
setupDragAndDrop(document.getElementById('glb-files'), document.getElementById('glb-bulk-drop-zone'));
setupDragAndDrop(document.getElementById('txt-files'), document.getElementById('txt-bulk-drop-zone'));
setupDragAndDrop(document.getElementById('png-files'), document.getElementById('png-bulk-drop-zone'));

checkSession();