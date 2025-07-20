<template>
	<nav class="nav">
		<router-link v-if="!hideTrain" :to="{ name: 'home' }" class="btn" active-class="active">{{ $t('train')
		}}</router-link>
		<router-link v-if="!hideTrain" :to="{ name: 'chat' }" :class="{ active: $route.name === 'chat-only' }" class="btn"
			active-class="active">{{ $t('Test Chat') }}</router-link>
		<router-link v-if="PROJECT_SHOW" :to="{ name: 'projects' }" class="btn" active-class="active">{{ $t('projects')
		}}</router-link>
		<router-link v-if="!hideTrain && CHATS_HISTORY_SHOW" :to="{ name: 'chats-history' }" class="btn nowrap"
			active-class="active">{{ $t('chats-history') }}</router-link>
	</nav>
</template>

<script>
export default {
	props: ['hideTrain'],
}
</script>

<style lang="scss">
@media (min-width:481px)  {
	.nav {
		position: absolute;
		top: 35px;

		border-radius: 27px;
		padding: 0.3rem 0.4rem 0.3rem 0.4rem;
		display: flex;
		font-size: 13px;
		flex-direction: row;
		background-color: #d8dee3;
		gap: 20px;
		box-shadow: 5px 5px 5px #93a1b0bf, -3px -3px rgba(255, 255, 255, 0.377);


		.btn {
			padding: 8px 13px!important;
			background-color: #dde3e8;
			box-shadow: 5px 5px 5px #93a1b0bf, -3px -3px rgba(255, 255, 255, 0.377);
		}
	}
}
.nav {
	background: #d8dee3;
	position: relative;
	top: 35px;
	display: flex;
	gap: 10px;
    justify-content: space-between;
	flex-wrap: wrap;
	font-weight: 200;
	max-width: 100%;
	margin-left: auto;
	margin-right: auto;

	.btn {
		padding: 9px 13px;
		font-weight: 400;
		min-width: 112px;
		white-space: nowrap;
	}
}

.nowrap {
	white-space: nowrap;
}</style>