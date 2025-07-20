<template>
    <div class="container">
        <input type="text" placeholder="Enter project name" style="color: black" v-model="name">
        <div class="tx-c mt15">
            <input @click="() => sendForm()" class="btn" value="Create Project" type="submit">
        </div>
    </div>
</template>

<script>
import axios from '@/axios';

export default {
    data() {
        return {
            name: '',
        }
    },
    methods: {
        async sendForm() {
            try {
                this.name = this.name.trim();

                if (!this.name) {
                    this.$toast.error('Please enter the project name', { position: "top" });
                    return;
                }
                axios.post(API_URL + '/local-intents-responses-storage/projects/create', {
                    name: this.name,
                    bot_id: API_BOT_ID
                }).then(() => {
                    this.$store.dispatch('updateAvailableProjects');
                })
            } catch (error) {
                console.log(error);
            }
        }
    }
}
</script>

<style lang="scss">
div.form {

    input {
        display: block !important;
        min-height: 50px;
        min-width: 100%;
    }

    label {
    }

    button {
        margin-left: 10px;
    }

}
</style>