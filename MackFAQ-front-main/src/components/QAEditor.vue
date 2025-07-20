<template>
    <textarea style="width: 100%; height: 100%;" :placeholder="`Question1?
Answer1

Question2?
Answer2`" v-model.trim="value"></textarea>
</template>

<script>
export default {
    props: ['modelValue', 'project_id'],

    computed: {
        value: {
            get() {
                return this.modelValue;
            },
            set(v) {
                this.$emit('update:modelValue', v);
            },
        },
        savedTrainingData() {
            return this.project_id && this.$store.getters.getProjectsTrainingData(this.project_id) || '';
        },
    },
    mounted() {
        if (this.project_id) {
            this.$store.dispatch('updateProjectTrainingData', { project_id: this.project_id });
        }
    },
    watch: {
        savedTrainingData() {
            this.value = this.savedTrainingData;
        },
        project_id(val) {
            this.$store.dispatch('updateProjectTrainingData', { project_id: val });
        }
    }
}
</script>