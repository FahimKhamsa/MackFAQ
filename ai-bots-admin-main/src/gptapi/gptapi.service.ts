import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, map } from 'rxjs';
import { IGptApiConfig } from './gptapiconfig.constants';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class GptapiService {
  private readonly api_url = 'https://api.openai.com/v1/completions';
  private readonly api_url_gtp4 = 'https://api.openai.com/v1/chat/completions';
  private readonly openrouter_url =
    'https://openrouter.ai/api/v1/chat/completions';
  private logger = new Logger(GptapiService.name);

  private _requestsQueue: {
    // resolver: Function;
    // rejector: Function;
    resolver: (value: unknown) => void;
    rejector: (reason?: any) => void;
    targetFunction: () => Promise<any>;
    lastRun: number;
    deadLine: number;
  }[] = [];
  private schedulerStarted = false;

  constructor(
    private httpService: HttpService,
    @Inject('GPT_API_CONFIG') private gptApiConfig: IGptApiConfig,
  ) {}

  public async startQueued(targetFunction: () => Promise<any>) {
    const promise = new Promise((resolve, reject) => {
      console.log('Added');
      this._requestsQueue.push({
        resolver: resolve,
        rejector: reject,
        targetFunction,
        lastRun: null,
        deadLine: Date.now() + 60 * 1000 * 3,
      });
    });

    return promise;
  }

  @Interval(500)
  private async processScheduler() {
    if (this.schedulerStarted) {
      return;
    }
    this.schedulerStarted = true;
    for (const i in this._requestsQueue) {
      const f = this._requestsQueue[i];

      if (f.lastRun !== null && f.lastRun + 60 * 1000 * 0.5 > Date.now()) {
        continue;
      }

      if (f.deadLine <= Date.now()) {
        f.rejector('Timeout');
        delete this._requestsQueue[i];
        continue;
      }

      try {
        const result = await this._requestsQueue[i].targetFunction();
        console.log(result);
        this._requestsQueue[i].resolver(result);
      } catch (ex) {
        this.logger.error(ex);
        if (ex.message.includes('Code: 429')) {
          this._requestsQueue[i].lastRun = Date.now();
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        this._requestsQueue[i].rejector(ex);
      }

      delete this._requestsQueue[i];
      await new Promise((r) => setTimeout(r, 1000));
    }
    this.schedulerStarted = false;
  }

  public async getComplete(
    prompt: string,
    _stopStrings: string[] = undefined,
    model = 'text-davinci-003',
  ) {
    const data = {
      prompt: prompt,
      model: model,
      temperature: 0.7,
      presence_penalty: 0.6,
      stop: _stopStrings,
      max_tokens: 4090 - prompt.length,
    };
    return await firstValueFrom(
      this.httpService
        .post(this.api_url, data, {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + this.gptApiConfig.api_key,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error?.message);
            this.logger.error(error?.response?.data);
            throw new Error('An error happened!');
          }),
        )
        .pipe(map((v) => v.status && v.data)),
    );
  }

  private async _getComplete4(
    messages: { role: 'assistant' | 'user' | 'system'; content: string }[],
    model = 'gpt-3.5-turbo',
  ) {
    const data = {
      model: model,
      messages: messages,
    };
    console.log(messages);
    return await firstValueFrom(
      this.httpService
        .post(this.api_url_gtp4, data, {
          timeout: 60000,
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + this.gptApiConfig.api_key,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error?.message);
            this.logger.error(error?.response?.data);
            throw new Error(
              'An error happened! Code: ' + error?.response.status,
            );
          }),
        )
        .pipe(map((v) => v.status && v.data)),
    );
  }

  private async _getCompleteOpenRouter(
    messages: { role: 'assistant' | 'user' | 'system'; content: string }[],
    model = 'gpt-3.5-turbo',
  ) {
    const data = {
      model: model,
      messages: messages,
    };

    return await firstValueFrom(
      this.httpService
        .post(this.openrouter_url, data, {
          timeout: 60000,
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + this.gptApiConfig.openrouter_api_key,
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:8080',
            'X-Title': 'Multi Project Management SOP Framework',
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error('OpenRouter API Error:', error?.message);
            this.logger.error(error?.response?.data);
            throw new Error(
              'OpenRouter API error! Code: ' + error?.response?.status,
            );
          }),
        )
        .pipe(map((v) => v.status && v.data)),
    );
  }

  public async getComplete4(
    messages: { role: 'assistant' | 'user' | 'system'; content: string }[],
    model = 'gpt-3.5-turbo',
    provider: 'openai' | 'openrouter' = 'openai',
  ) {
    // Try OpenRouter first (primary), fallback to OpenAI automatically
    if (provider === 'openrouter') {
      try {
        return (await this.startQueued(() =>
          this._getCompleteOpenRouter(messages, model),
        )) as any;
      } catch (error) {
        this.logger.warn(
          'OpenRouter failed, falling back to OpenAI:',
          error.message,
        );
        // Automatic fallback to OpenAI
        return (await this.startQueued(() =>
          this._getComplete4(messages, model),
        )) as any;
      }
    }

    // Direct OpenAI call
    return (await this.startQueued(() =>
      this._getComplete4(messages, model),
    )) as any;
  }
}
