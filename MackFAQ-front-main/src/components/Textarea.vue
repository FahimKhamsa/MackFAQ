<template>
    <textarea :style="_style" :class="class" :placeholder="placeholder" v-model.trim="value" ref="textarea" @keyup="resize"></textarea>
</template>
  
<script>
export default {
    props: ['modelValue', 'style', 'class', 'placeholder'],
    emits: ['update:modelValue'],
    data() {
        return {
            _style: this.$props.style || {},
        }
    },
    created() {
        this._style['overflow-y'] = 'hidden';
    },
    computed: {
        value: {
            get() {
                this.resize();
                return this.modelValue
            },
            set(value) {
                this.$emit('update:modelValue', value);
                this.resize();
            }
        }
    },
    methods: {
        resize() {
            this._style.height = '10px';
            this.$nextTick(() => {
                const { textarea } = this.$refs;
                this._style.height = textarea.scrollHeight + 15 + 'px';
            })
        }
    },
    watch: {
        value(v) {
            this.resize();
        }
    }
}
</script>