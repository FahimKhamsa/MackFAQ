<template>
    <div>
        <h3>Sign Up / Log In to Private AI</h3>
        <form @submit.prevent="login">
            <div class="field">
                <input type="text" placeholder="Email" id="email" v-model.trim="form.email">
            </div>
            <div class="field">
                <input type="password" placeholder="Password" id="password" v-model="form.password">
            </div>
            <button :disabled="formDisabled" type="submit">Sign In</button>
        </form>
        <router-link :to="{ name: 'Registration' }">Sign Up</router-link>
    </div>
</template>

<script>

export default {
    components: {
    },
    data() {
        return {
            formDisabled: false,
            form: {
                email: null,
                password: null,
            }
        }
    },
    async created() {
    },
    computed: {
    },
    watch: {
    },
    methods: {
        login() {
            this.formDisabled = true;
            this.$store.dispatch('login', this.form)
                .then(() => {
                    this.$toast.success("Welcome");
                    this.$router.push({ name: 'home' })
                })
                .catch(e => {
                    this.formDisabled = false;
                    if (e.response && e.response.status === 401) {
                        this.$toast.error("Email or Password is incorrect")
                    } else {
                        this.$toast.error("Login failed:<br>Please check your connection and try again")
                    }
                });

        }
    }
}
</script>
