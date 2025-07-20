<template>
	<div class="lang" @click="changeLanguage">
        <img src="@/assets/img/lang.svg" alt="">
    </div>
</template>

<script>
    export default {
        methods: {
            changeLanguage() {
	            if (this.$i18next.language == 'en') {
	            	this.$i18next.changeLanguage('fr');
	            } else {
	            	this.$i18next.changeLanguage('en');
	            }
	        }
        }
    }
</script>

<style lang="scss">
	.lang {
		position: absolute;
		top: 35px;
		right: 115px;

		@media (max-width: 750px) {
			top: 10px;
			right: 10px;
			width: 50px;
		}
	}
</style>