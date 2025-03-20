console.log('auth.js loaded');

let config;
let supabase;

async function loadConfig() {
    const response = await fetch('config.json');
    config = await response.json();
    supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

let token = null;

async function checkSession(callback) {
    await loadConfig(); // Ensure config is loaded
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Session check error:', error);
        callback(null);
        return null;
    }
    if (session && session.provider_token) {
        token = session.provider_token;
        console.log('Existing session found:', session);
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: { 'Authorization': `token ${token}` }
            });
            if (!response.ok) throw new Error(`GitHub token validation failed: ${response.status}`);
            const user = session.user;
            sessionStorage.setItem('github_user', JSON.stringify(user));
            callback(user);
            return user;
        } catch (error) {
            console.error('Token validation failed:', error);
            token = null;
            await supabase.auth.signOut();
            sessionStorage.removeItem('github_user');
            callback(null);
            return null;
        }
    } else {
        console.log('No existing session, waiting for OAuth redirect...');
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session && session.provider_token) {
                token = session.provider_token;
                console.log('Signed in with token:', token);
                try {
                    fetch('https://api.github.com/user', {
                        headers: { 'Authorization': `token ${token}` }
                    }).then(response => {
                        if (!response.ok) throw new Error('GitHub token validation failed after sign-in');
                        const user = session.user;
                        sessionStorage.setItem('github_user', JSON.stringify(user));
                        callback(user);
                    }).catch(error => {
                        console.error('Post-login token validation failed:', error);
                        token = null;
                        supabase.auth.signOut();
                        callback(null);
                    });
                } catch (error) {
                    console.error('Error during post-login validation:', error);
                    token = null;
                    callback(null);
                }
            }
        });
        callback(null);
        return null;
    }
}

async function loginWithGitHub() {
    await loadConfig();
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { scopes: 'public_repo' }
        });
        if (error) throw error;
    } catch (error) {
        console.error('Login error:', error);
        return error.message;
    }
}

function updateLoginDisplay(user, loginBtn) {
    loginBtn.innerHTML = `<img src="${user.user_metadata.avatar_url}" alt="${user.user_metadata.preferred_username}"><span>${user.user_metadata.preferred_username}</span>`;
    loginBtn.classList.add('profile');
    loginBtn.disabled = false;
}

async function signOut() {
    await loadConfig();
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        token = null;
        sessionStorage.removeItem('github_user');
        console.log('Signed out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        return error.message;
    }
}

window.auth = {
    checkSession,
    loginWithGitHub,
    updateLoginDisplay,
    getToken: () => token,
    signOut
};