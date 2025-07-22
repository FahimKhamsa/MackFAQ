import { createRouter, createWebHistory } from 'vue-router'
import Train from '../views/Train.vue'
import Chat from '../views/Chat.vue'
import Projects from '../views/Projects.vue'
import ProjectDetails from '../views/ProjectDetails.vue'
import ChatsHistory from '../views/ChatsHistory.vue'
import MainLayout from '../views/MainLayout.vue'
import Auth from '@/views/Auth.vue'
import Login from '@/components/Auth/Login.vue'
import Registration from '@/components/Auth/Registration.vue'
import store from '@/store'
import TwoFa from '@/components/Auth/TwoFa.vue'

const routes = [
    {
        path: '',
        beforeEnter: (route, from, next) => {
            if (route?.name === undefined) {
                return next({ name: 'home' });
            }

            // Check authentication for protected routes
            const token = localStorage.getItem('t');
            const isAuthRequired = route.matched.some(record => record.meta.authRequired);

            if (isAuthRequired && !token) {
                return next({ name: 'Login' });
            }

            return next();
        },
        children: [
            {
                path: '',
                component: MainLayout,
                meta: {
                    authRequired: true
                },
                children: [
                    {
                        path: '/',
                        name: 'home',
                        component: Train
                    },
                    {
                        path: '/chat',
                        name: 'chat',
                        component: Chat
                    },
                    {
                        path: '/chat-only',
                        name: 'chat-only',
                        component: Chat
                    },
                    {
                        path: '/projects',
                        name: 'projects',
                        component: Projects
                    },
                    {
                        path: '/projects/:id',
                        name: 'project-details',
                        component: ProjectDetails,
                        props: true
                    },
                    {
                        path: '/chats-history',
                        name: 'chats-history',
                        component: ChatsHistory
                    }

                ],
            },
            {
                path: '/auth',
                component: Auth,
                children: [
                    {
                        path: 'registration',
                        name: 'Registration',
                        component: Registration,
                    },
                    {
                        path: 'login',
                        name: 'Login',
                        component: Login,
                    },
                    {
                        path: '2fa',
                        name: 'TwoFa',
                        component: TwoFa,
                    },
                ]
            },
            {
                path: '/embed',
                children: [
                    {
                        name: 'embed',
                        path: 'chat',
                        component: Chat
                    }
                ]
            },
            {
                path: '/chat/:project_name/:only_project_link',
                component: Chat,
                name: "ChatPublic",
                props: true,
                meta: {
                    authRequired: false
                }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes
})

export default router
