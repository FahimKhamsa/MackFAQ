import axios from "axios";
import { useToast } from "vue-toast-notification";
import { getKT } from "./store";
import router from "./router";

// Set the base URL for all axios requests
const baseURL = process.env.VUE_APP_API_HOST || 'http://localhost:3000';
console.log('Axios base URL:', baseURL);
axios.defaults.baseURL = baseURL;

function reject(response) {
    // Bypass authentication redirects for testing RAG functionality
    if (response.response.data.message === '2FA Is required') {
        console.log('2FA required - bypassing for RAG testing');
        // Don't redirect, just log the error
    }
    if (response.response.status === 401) {
        console.log('401 Unauthorized - bypassing for RAG testing');
        // Don't redirect to login, just log the error
    }

    const toast = useToast();
    const error = response.response?.data?.message;
    
    if (!error) {
        throw response;
    }

    const errors = Array.isArray(error) ? error : [error];
    toast.error(`Error:<br> ${errors.join('<br>')}`);
    throw new Error(errors)
}

axios.interceptors.response.use(
    (value) => value, 
    reject
)

axios.interceptors.request.use((config) => {
    const token = getKT();
    if (token) {
        config.headers.Authorization = 'Bearer ' + token;
    }
    console.log('Request config:', config.url, config.baseURL);
    return config;
})

export default axios;
