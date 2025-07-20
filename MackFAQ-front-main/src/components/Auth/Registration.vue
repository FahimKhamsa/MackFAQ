<template>
    <div>
        <h3>Sign Up / Log In to SuperTech</h3>
        <form @submit.prevent="registration">
            <div class="field">
                <input type="text" placeholder="Email" id="email" v-model.trim="form.email">
            </div>
            <div class="field">
                <input type="password" placeholder="Password" id="password" v-model="form.password">
            </div>
            <div class="field">
                <input type="password" placeholder="Confirm password" id="confirm_password" v-model="form.confirm_password">
            </div>
            <button :disabled="formDisabled" type="submit">Sign Up</button>
        </form>
        <router-link :to="{name: 'Login'}">Sign In</router-link>
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
                confirm_password: null,
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
        registration() {
            if (this.form.confirm_password !== this.form.password) {
                this.$toast.error("Confirm password must be equal password!");
                return;
            }
            this.formDisabled = true;

            this.$store.dispatch('register', this.form)
                .then(() => {
                    this.$toast.success("Welcome");
                    this.$router.push({name: 'home'})
                })
                .catch(e => {
                    this.formDisabled = false;
                    if (e.response && e.response.status === 401) {
                        this.$toast.error("Login failed:<br>Password is incorrect")
                    } else {
                        this.$toast.error("Registration failed:<br>Please check your connection and try again")
                    }
                })
        }
    }
}
</script>
