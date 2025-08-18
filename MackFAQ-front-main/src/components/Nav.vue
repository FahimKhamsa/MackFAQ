<template>
	<nav class="modern-nav">
		<div class="nav-container">
			<router-link v-if="!hideTrain" :to="{ name: 'home' }" class="nav-item" active-class="active">
				<i class="fas fa-graduation-cap"></i>
				<span>{{ $t('train') }}</span>
			</router-link>

			<router-link v-if="!hideTrain" :to="{ name: 'chat' }" :class="{ active: $route.name === 'chat-only' }"
				class="nav-item" active-class="active">
				<i class="fas fa-comments"></i>
				<span>{{ $t('Chat') }}</span>
			</router-link>

			<router-link v-if="PROJECT_SHOW" :to="{ name: 'projects' }" class="nav-item" active-class="active">
				<i class="fas fa-folder-open"></i>
				<span>{{ $t('projects') }}</span>
			</router-link>

			<router-link v-if="!hideTrain && CHATS_HISTORY_SHOW" :to="{ name: 'chats-history' }" class="nav-item"
				active-class="active">
				<i class="fas fa-history"></i>
				<span>{{ $t('chats-history') }}</span>
			</router-link>

			<button @click="$store.dispatch('logOut')" class="nav-item logout-item">
				<i class="fas fa-sign-out-alt"></i>
				<span>Logout</span>
			</button>
		</div>
	</nav>
</template>

<script>
export default {
	props: ['hideTrain'],
}
</script>

<style lang="scss">
.modern-nav {
	.nav-container {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 1.5rem;
		padding: 0;

		.nav-item {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.5rem 1rem;
			border-radius: 0.375rem;
			color: var(--gray-700);
			text-decoration: none;
			font-weight: 500;
			transition: all 0.2s ease;
			position: relative;
			white-space: nowrap;
			font-size: 0.875rem;
			border: none;
			background: none;
			cursor: pointer;

			i {
				font-size: 0.875rem;
				color: var(--gray-500);
			}

			span {
				font-size: 0.875rem;
			}

			&:hover {
				background: rgba(37, 99, 235, 0.1);
				color: var(--primary-blue);
				transform: translateY(-1px);

				i {
					color: var(--primary-blue);
				}
			}

			&.active {
				background: var(--primary-blue);
				color: white;
				box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);

				i {
					color: white;
				}
			}

			&.logout-item {
				background: rgba(239, 68, 68, 0.1);
				color: var(--danger-red);
				border: 1px solid rgba(239, 68, 68, 0.2);

				i {
					color: var(--danger-red);
				}

				&:hover {
					background: var(--danger-red);
					color: white;
					transform: translateY(-1px);
					box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);

					i {
						color: white;
					}
				}
			}
		}
	}
}

// Mobile responsive navigation
@media (max-width: 768px) {
	.modern-nav {
		.nav-container {
			gap: 0.125rem;

			.nav-item {
				padding: 0.375rem 0.75rem;
				font-size: 0.75rem;

				i {
					font-size: 0.75rem;
				}

				span {
					font-size: 0.75rem;
				}
			}
		}
	}
}

@media (max-width: 640px) {
	.modern-nav {
		.nav-container {
			.nav-item {
				padding: 0.375rem 0.5rem;

				span {
					display: none;
				}

				i {
					margin: 0;
					font-size: 1rem;
				}
			}
		}
	}
}
</style>
