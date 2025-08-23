<template>
    <div class="form">
        <div v-if="typeSelect === 'table'">
            <table v-if="projectsList.length" class="table">
                <thead>
                    <tr>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                    </tr>
                </thead>
                <tr v-for="(project, index) of projectsList" :key="project.id">
                    <td>{{ project.id }}</td>
                    <td>
                        <template v-if="editing?.[`${project.id}_name`]?.editing">
                            <div style="position: relative;">
                                <input
                                    style="background-color: white; max-width: 110px; font-size: larger;padding: 10px;border-radius: 10px;"
                                    v-model="editing[`${project.id}_name`].value" type="text" />
                                <button @click="editFieldEnd(`${project.id}_name`)"
                                    style="position: absolute;margin-top: 10px; left: 0;padding: 10px;background-color: var(--colAkcent);border-radius: 10px;color: white; cursor: pointer;margin-left: 0;">Cancel</button>
                                <button @click="saveEditProject(`${project.id}_name`)"
                                    style="position: absolute;margin-top: 10px;right: 0;padding: 10px;background-color: var(--colAkcent);border-radius: 10px; color: white; cursor: pointer;">Save</button>
                            </div>
                        </template>
                        <template v-else>
                            <div @click="editFieldStart(`${project.id}_name`, project.name)" style="display: flex;">
                                {{ project.name }}<div style="margin-left: 20px;"></div>
                            </div>
                        </template>
                    </td>
                    <td style="width: 10px;">
                        <div v-if="!editing?.[`${project.id}_name`]?.editing"
                            @click="() => editFieldStart(`${project.id}_name`, project.name)">
                            <font-awesome-icon icon="edit" />
                        </div>
                    </td>
                    <td style="width: 10px;" @click="() => showDeleteConfirmation(project)"><font-awesome-icon
                            icon="trash" />
                    </td>
                </tr>
            </table>
            <div style="text-align: center;" v-else>No projects added yet</div>
        </div>
        <select v-else v-model="value" placeholder="Select project">
            <option :disabled="!allowEmpty" :value="0">Select project</option>
            <option v-if="allowGeneral" value="general">General Chat</option>
            <option v-for="(project, index) of projectsList" :key="project.id" :value="project.id">
                {{ project.name }}
            </option>
        </select>

        <!-- Delete Confirmation Modal -->
        <ConfirmationModal :show="showDeleteModal" type="delete" title="Delete Project"
            :item-name="projectToDelete?.name || `Project ${projectToDelete?.id}`"
            message="Are you sure you want to delete the project" warning-text="This action cannot be undone."
            :is-loading="isDeleting" confirm-text="Delete Project" loading-text="Deleting..." @confirm="confirmDelete"
            @cancel="cancelDelete" />
    </div>
</template>

<script>
import axios from '@/axios';
import ConfirmationModal from '@/components/ConfirmationModal.vue';

export default {
    components: {
        ConfirmationModal
    },
    data() {
        return {
            value: this.modelValue,
            inteval: null,
            defaultProjectId: null,
            editing: {

            },
            showDeleteModal: false,
            projectToDelete: null,
            isDeleting: false
        }
    },
    props: ['modelValue', 'typeSelect', 'allowEmpty', 'allowGeneral'],
    computed: {
        projectsList() {
            return this.$store.getters.getAvailableProjects.sort((a, b) => b.id - a.id);
        },
        API_URL() {
            return process.env.VUE_APP_API_HOST;
        },
        currentBot() {
            return this.$store.getters.getProfile?.default_bot;
        }
    },
    watch: {
        value() {
            this.$emit('update:modelValue', this.value);
            localStorage.setItem('defaultProjectId', this.value);
        },
        projectsList() {
            if (this.allowEmpty && !this.defaultProjectId || this.value || !this.projectsList.length) return;
            this.value = this.defaultProjectId || this.projectsList[0].id;
        }
    },
    methods: {
        editFieldStart(fieldName, initValue) {
            this.editing[fieldName] = {
                editing: true,
                value: initValue,
            };
        },
        editFieldEnd(fieldName) {
            this.editing[fieldName].editing = false;
        },
        async saveEditProject(fieldName) {
            const [projectId, projectFieldName] = fieldName.split('_');
            await this.updateProject(projectId, { [projectFieldName]: this.editing[fieldName].value });
            await this.updateList();
            this.editFieldEnd(fieldName);
        },
        async updateList() {
            try {
                this.$store.dispatch('updateAvailableProjects');
            } catch (error) {
                console.log(error);
            }
        },
        showDeleteConfirmation(project) {
            this.projectToDelete = project;
            this.showDeleteModal = true;
        },

        cancelDelete() {
            this.showDeleteModal = false;
            this.projectToDelete = null;
            this.isDeleting = false;
        },

        async confirmDelete() {
            if (!this.projectToDelete) return;

            try {
                this.isDeleting = true;
                await axios.post(this.API_URL + '/projects/management/delete', {
                    id: this.projectToDelete.id
                });

                this.$store.dispatch('updateAvailableProjects');
                this.cancelDelete();
            } catch (error) {
                console.log(error);
                this.isDeleting = false;
            }
        },

        async updateProject(id, data) {
            try {
                axios.post(this.API_URL + '/projects/management/update', {
                    ...data,
                    id: +id,
                }).then(() => {
                    this.$store.dispatch('updateAvailableProjects');
                })
            } catch (error) {
                console.log(error);
            }
        }
    },
    created() {
        if (this.inteval) {
            clearInterval(this.inteval);
        }
        this.defaultProjectId = +(localStorage.getItem('defaultProjectId') || 0);

        this.updateList();

        this.$store.dispatch("loadDefaultProject").then(id => {
            if (!this.defaultProjectId) {
                this.defaultProjectId = id;
                return this.updateList();
            }
        });

        this.inteval = setInterval(() => this.updateList(), 10000);
    },
    beforeUnmount() {
        if (this.inteval) {
            clearInterval(this.inteval);
        }
    }

}
</script>

<style lang="scss">
div.form {

    // margin-bottom: 30px;

    select {
        flex-grow: 1;
        margin-right: 10px;
        background: var(--colBg);
        color: #686868;
        min-height: 30px;
        min-width: 100%;
        border-radius: 27px;

        font-weight: bold;

        padding: 1.3rem;

        background-image: url(../../assets/img/shevron.png);

        background-size: 0.7rem;
        background-position: right 1.3rem center;

        background-repeat: no-repeat;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;

        box-shadow: 5px 5px 5px #93a1b0bf;

    }

}

table {
    min-width: 100%;

    td {
        padding: 20px;
    }

    // td:last-child {
    //     max-width: 50px;
    // }
}
</style>

<style scoped>
table {
    border-collapse: collapse;
}

tr {
    border-bottom: 1px solid black;
}

tr:last-child {
    border-bottom: none;
}

tr:first-child {
    border-bottom: none;
}
</style>
