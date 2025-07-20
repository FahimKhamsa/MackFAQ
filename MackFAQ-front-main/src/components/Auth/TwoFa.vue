<template>
    <div>
        <h3>2FA</h3>
        <form @submit.prevent="login">
            <div class="field">
                <input type="text" placeholder="Code From Email" id="code" v-model.trim="form.code">
            </div>
            <button :disabled="formDisabled" type="submit">Sign In</button>
        </form>
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
            this.$store.dispatch('confirm2Fa', this.form)
                .then(() => {
                    this.$toast.success("Welcome");
                    this.$router.push({name: 'home'})
                })
                .catch(e => {
                    this.formDisabled = false;
                    if (e.response.status === 400) {
                        this.$toast.error("Code is incorrect");
                        return;
                    }
                    this.$toast.error("Validation failed, please, try again");
                    this.$router.push({name: 'Login'})
                });

        }
    }
}
</script>
