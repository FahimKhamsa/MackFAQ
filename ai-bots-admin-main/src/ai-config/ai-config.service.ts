import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AIConfiguration } from './entities/ai-configuration.model';

@Injectable()
export class AIConfigService {
    constructor(
        @InjectModel(AIConfiguration) private aiConfigModel: typeof AIConfiguration,
    ) {}

    async getUserConfiguration(userId: number): Promise<AIConfiguration> {
        let config = await this.aiConfigModel.findOne({
            where: { user_id: userId },
        });

        // Create default configuration if none exists
        if (!config) {
            config = await this.createDefaultConfiguration(userId);
        }

        return config;
    }

    async createDefaultConfiguration(userId: number): Promise<AIConfiguration> {
        const defaultConfig = new this.aiConfigModel();
        defaultConfig.user_id = userId;
        defaultConfig.system_prompt = 'You are a helpful AI assistant for project management and document analysis. Provide accurate, professional responses based on the uploaded documents and company SOPs.';
        defaultConfig.selected_model = 'gpt-3.5-turbo';
        defaultConfig.prompt_locked = false;
        defaultConfig.api_provider = 'openrouter';
        defaultConfig.include_sop = true;
        defaultConfig.available_models = [
            'gpt-3.5-turbo',
            'gpt-4',
            'anthropic/claude-3-haiku',
            'anthropic/claude-3-sonnet',
            'meta-llama/llama-3-8b-instruct',
        ];
        defaultConfig.auto_fallback = true;

        await defaultConfig.save();
        return defaultConfig;
    }

    async updateSystemPrompt(userId: number, systemPrompt: string): Promise<AIConfiguration> {
        const config = await this.getUserConfiguration(userId);
        
        if (config.prompt_locked) {
            throw new BadRequestException('System prompt is locked and cannot be modified');
        }

        config.system_prompt = systemPrompt;
        await config.save();
        return config;
    }

    async togglePromptLock(userId: number): Promise<AIConfiguration> {
        const config = await this.getUserConfiguration(userId);
        config.prompt_locked = !config.prompt_locked;
        await config.save();
        return config;
    }

    async updateSelectedModel(userId: number, model: string): Promise<AIConfiguration> {
        const config = await this.getUserConfiguration(userId);
        
        // Validate model is in available models
        if (!config.available_models.includes(model)) {
            throw new BadRequestException(`Model ${model} is not available. Available models: ${config.available_models.join(', ')}`);
        }

        config.selected_model = model;
        await config.save();
        return config;
    }

    async updateAPIProvider(userId: number, provider: 'openai' | 'openrouter'): Promise<AIConfiguration> {
        const config = await this.getUserConfiguration(userId);
        config.api_provider = provider;
        await config.save();
        return config;
    }

    async updateAPIKeys(userId: number, keys: { openai_api_key?: string, openrouter_api_key?: string }): Promise<AIConfiguration> {
        const config = await this.getUserConfiguration(userId);
        
        if (keys.openai_api_key !== undefined) {
            config.openai_api_key = keys.openai_api_key;
        }
        
        if (keys.openrouter_api_key !== undefined) {
            config.openrouter_api_key = keys.openrouter_api_key;
        }

        await config.save();
        return config;
    }

    async toggleSOPInclude(userId: number): Promise<AIConfiguration> {
        const config = await this.getUserConfiguration(userId);
        config.include_sop = !config.include_sop;
        await config.save();
        return config;
    }

    async updateSOPInclude(userId: number, includeSOP: boolean): Promise<AIConfiguration> {
        const config = await this.getUserConfiguration(userId);
        config.include_sop = includeSOP;
        await config.save();
        return config;
    }

    async toggleAutoFallback(userId: number): Promise<AIConfiguration> {
        const config = await this.getUserConfiguration(userId);
        config.auto_fallback = !config.auto_fallback;
        await config.save();
        return config;
    }

    async getAvailableModels(): Promise<{ openai: string[], openrouter: string[] }> {
        return {
            openai: [
                'gpt-3.5-turbo',
                'gpt-4',
                'gpt-4-turbo-preview',
            ],
            openrouter: [
                'anthropic/claude-3-haiku',
                'anthropic/claude-3-sonnet',
                'anthropic/claude-3-opus',
                'meta-llama/llama-3-8b-instruct',
                'meta-llama/llama-3-70b-instruct',
                'mistralai/mixtral-8x7b-instruct',
                'google/gemini-pro',
            ],
        };
    }

    async updateAvailableModels(userId: number, models: string[]): Promise<AIConfiguration> {
        const config = await this.getUserConfiguration(userId);
        config.available_models = models;
        
        // If current selected model is not in new available models, reset to first available
        if (!models.includes(config.selected_model)) {
            config.selected_model = models[0] || 'gpt-3.5-turbo';
        }

        await config.save();
        return config;
    }

    async resetToDefaults(userId: number): Promise<AIConfiguration> {
        const config = await this.getUserConfiguration(userId);
        
        config.system_prompt = 'You are a helpful AI assistant for project management and document analysis. Provide accurate, professional responses based on the uploaded documents and company SOPs.';
        config.selected_model = 'gpt-3.5-turbo';
        config.prompt_locked = false;
        config.api_provider = 'openrouter';
        config.include_sop = true;
        config.available_models = [
            'gpt-3.5-turbo',
            'gpt-4',
            'anthropic/claude-3-haiku',
            'anthropic/claude-3-sonnet',
            'meta-llama/llama-3-8b-instruct',
        ];
        config.auto_fallback = true;

        await config.save();
        return config;
    }

    async deleteUserConfiguration(userId: number): Promise<{ message: string }> {
        const config = await this.aiConfigModel.findOne({
            where: { user_id: userId },
        });

        if (config) {
            await config.destroy();
        }

        return { message: 'AI configuration deleted successfully' };
    }
}
