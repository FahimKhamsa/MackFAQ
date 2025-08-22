import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import locales from '@/language.js';
import './assets/css/style.scss';

import i18next from 'i18next';
import I18NextVue from 'i18next-vue';
import { library } from "@fortawesome/fontawesome-svg-core";
import {
	faClose, faEdit, faFile, faTrash, faCopy, faEllipsisH,
	faSpinner, faTimes, faCheck, faClock, faDownload, faUpload,
	faBrain, faRedo, faComments, faUser, faRobot, faBook,
	faFolder, faFolderOpen, faPlus, faMinus, faArrowLeft,
	faChevronLeft, faChevronRight, faGraduationCap, faHistory,
	faSignOutAlt, faCloudUploadAlt, faSave, faExclamationTriangle,
	faInfoCircle, faEye, faFileAlt, faFilePdf, faFileExcel,
	faFileImage, faFileCsv, faFileUpload, faShareAlt, faUnlock,
	faLock, faPaperPlane
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import ToastPlugin from 'vue-toast-notification';
import 'vue-toast-notification/dist/theme-bootstrap.css';

library.add(
	faEdit, faTrash, faClose, faFile, faCopy, faEllipsisH,
	faSpinner, faTimes, faCheck, faClock, faDownload, faUpload,
	faBrain, faRedo, faComments, faUser, faRobot, faBook,
	faFolder, faFolderOpen, faPlus, faMinus, faArrowLeft,
	faChevronLeft, faChevronRight, faGraduationCap, faHistory,
	faSignOutAlt, faCloudUploadAlt, faSave, faExclamationTriangle,
	faInfoCircle, faEye, faFileAlt, faFilePdf, faFileExcel,
	faFileImage, faFileCsv, faFileUpload, faShareAlt, faUnlock,
	faLock, faPaperPlane
);

i18next.init({
	lng: 'en',
	resources: {
		en: { translation: locales.en },
		fr: { translation: locales.fr }
	},
});

const app = createApp(App).component("font-awesome-icon", FontAwesomeIcon).use(I18NextVue, { i18next }).use(store).use(router);
app.use(ToastPlugin);

app.config.globalProperties.BACKGROUND_VIDEO = process.env.VUE_APP_BACKGROUND_VIDEO;
app.config.globalProperties.BACKGROUND_chat_VIDEO = process.env.VUE_APP_BACKGROUND_chat_VIDEO;
app.config.globalProperties.BACKGROUND_embed_VIDEO = process.env.VUE_APP_BACKGROUND_embed_VIDEO;
app.config.globalProperties.PROJECT_SHOW = !+process.env.VUE_APP_PROJECT_HIDDEN
app.config.globalProperties.PROMPT_FOR_ANSWERS_SHOW = !!process.env.VUE_APP_PROMPT_FOR_ANSWERS_SHOW
app.config.globalProperties.UPLOADING_FAQ_SHOW = !+process.env.VUE_APP_UPLOADING_FAQ_DATA_HIDDEN
app.config.globalProperties.TEXT_FAQ_SHOW = !+process.env.VUE_APP_TEXT_FAQ_SHOW_HIDDEN
app.config.globalProperties.LANGUAGE_CHANGE_SHOW = false; // !+process.env.VUE_APP_CHANGE_LANGUAGE_HIDDEN
app.config.globalProperties.PROMPT_LABEL_NAME = process.env.VUE_APP_PROMPT_LABEL_NAME || 'prompt_prefix';
app.config.globalProperties.PROMPT_FOR_ANSWERS_LABEL_NAME = process.env.VUE_APP_PROMPT_FOR_ANSWERS_LABEL_NAME || 'prompt_for_answers';
app.config.globalProperties.CHATS_HISTORY_SHOW = !+process.env.VUE_APP_CHATS_HISTORY_HIDDEN;
app.config.globalProperties.DEFAULT_PROJECT_ID = process.env.VUE_APP_DEFAULT_PROJECT_ID !== undefined ? +process.env.VUE_APP_DEFAULT_PROJECT_ID : 0;
app.config.globalProperties.GLOBAL_PROMPT_SHOW = !+process.env.VUE_APP_GLOBAL_PROMPT_HIDDEN;

app.mount('#app')
