import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { catchError, firstValueFrom, lastValueFrom, map } from 'rxjs';
import * as yaml from 'yaml';
import * as crypto from 'crypto';

type IConfig = { rasa_host_url: string; model_name: string };
export type ITrainingInput = {
  questions: string[];
  answer: string;
  id: number;
};

@Injectable()
export class RasaapiService {
  private logger = new Logger(RasaapiService.name);

  private modelsFolder = './models/';

  constructor(private httpService: HttpService) {}

  public async getAnswer(user_prompt: string, config: IConfig) {
    let answer = null;
    let c = 0;
    const userName = Date.now().toString();
    while (answer === null && c++ < 2) {
      answer = await this.getAnswerFromRasa(user_prompt, userName, config);
      console.log({ answer });
      if (answer === '\\\\==no-rasa-answer**\\\\') {
        return null;
      }
      await new Promise((r) => setTimeout(r, 700));
    }
    return answer;
  }

  public async trainAndChangeModel(
    input: { text_original: string; id: number }[],
    config: IConfig,
  ) {
    const yaml = this.createYaml(input);
    console.log(yaml);
    const modelName = await lastValueFrom(
      this.httpService
        .post(config.rasa_host_url + '/model/train', yaml, {
          headers: { 'Content-Type': 'application/yaml' },
          timeout: 600000,
        })
        .pipe(
          catchError((error) => {
            this.logger.error(error, error?.stack);
            throw error;
          }),
        )
        .pipe(map((response) => response.headers['filename'])),
    );

    this.logger.debug({ modelName });

    await lastValueFrom(
      this.httpService.put(
        config.rasa_host_url + '/model',
        { model_file: this.modelsFolder + modelName },
        { headers: { 'Content-Type': 'application/json' }, timeout: 600000 },
      ),
    );

    return {
      modelName,
    };
  }

  private createYaml(input: { text_original: string; id: number }[]) {
    const intentsNames = [];
    const nlu = [];
    const responses = {
      utter_default: [
        {
          text: '\\\\==no-rasa-answer**\\\\',
        },
      ],
      // action_unlikely_intent: [
      //     {
      //         text: '\\\\==no-rasa-answer**\\\\'
      //     }
      // ],
    };
    const stories = [];
    input.forEach((v) => {
      const intentName = `intent_` + v.id;
      const answerName = 'utter_' + intentName;
      intentsNames.push(intentName);
      nlu.push({
        intent: intentName,
        examples: [v.text_original]
          .map((v) => '- ' + v.replace('\n', `\\n`) + '\n')
          .join(''),
        // "examples": v.questions.map(v => "- " + v.replace('\n', `\\n`) + '\n').join(''),
      });

      // responses[answerName] = [
      //     {
      //         "text": v.answer,
      //     }
      // ];

      stories.push({
        story: 'story_' + intentName,
        steps: [
          {
            intent: intentName,
          },
          {
            action: answerName,
          },
        ],
      });
    });

    let objectInput = {
      language: 'en',
      // "core_target": "select_prediction",
      // recipe: 'default.v1',
      // rules: [
      //     {
      //         rule: 'Fallback',
      //         steps: [
      //             {
      //                 intent: 'nlu_fallback',
      //             },
      //             {
      //                 action: 'utter_default'
      //             }
      //         ]
      //     },
      //     {
      //         rule: 'Fallback 2',
      //         steps: [
      //             {
      //                 action: 'action_unlikely_intent',
      //             },
      //             {
      //                 action: 'utter_default'
      //             }
      //         ]
      //     }
      // ],
      // "policies": [
      //     {
      //         "name": "MemoizationPolicy"
      //     },
      //     {
      //         "name": "RulePolicy",
      //         core_fallback_threshold: 0.3,
      //         core_fallback_action_name: "utter_default",
      //         enable_fallback_prediction: true
      //     },
      //     {
      //         "name": "UnexpecTEDIntentPolicy",
      //         "max_history": 5,
      //         "epochs": 100
      //     },
      //     {
      //         "name": "TEDPolicy",
      //         "max_history": 5,
      //         "epochs": 100,
      //         "constrain_similarities": true
      //     },
      // ],
      // "intents": intentsNames,
      pipeline: [
        {
          name: 'SpacyNLP',
          model: 'en_core_web_md',
        },
        {
          name: 'WhitespaceTokenizer',
        },
        {
          name: 'RegexFeaturizer',
        },
        {
          name: 'CRFEntityExtractor',
        },
        {
          name: 'EntitySynonymMapper',
        },
        {
          name: 'CountVectorsFeaturizer',
        },
        {
          name: 'DIETClassifier',
        },
        //     {
        //         "name": "WhitespaceTokenizer"
        //     },
        //     {
        //         "name": "RegexFeaturizer"
        //     },
        //     {
        //         "name": "LexicalSyntacticFeaturizer"
        //     },
        //     {
        //         "name": "CountVectorsFeaturizer",
        //         "analyzer": "char_wb",
        //         "min_ngram": 1,
        //         "max_ngram": 4
        //     },
        //     {
        //         "name": "DIETClassifier",
        //         "epochs": 100,
        //         "constrain_similarities": true
        //     },
        //     {
        //         "name": "EntitySynonymMapper"
        //     },
        //     {
        //         "name": "ResponseSelector",
        //         "epochs": 100,
        //         // "constrain_similarities": true
        //     },
        //     {
        //         "name": "FallbackClassifier",
        //         threshold: 0.3,
        //         ambiguity_threshold: 0.1
        //     },
      ],
      nlu: nlu,
      // "responses": responses,
      // "stories": stories,
    };

    return yaml.stringify(objectInput);
  }

  private async getAnswerFromRasa(
    user_prompt: string,
    _userName: string = null,
    config: IConfig,
  ) {
    const userName = _userName || Date.now().toString();
    return await firstValueFrom(
      this.httpService
        .post(config.rasa_host_url + '/webhooks/rest/webhook', {
          sender: userName,
          message: user_prompt,
        })
        .pipe(
          catchError((error) => {
            this.logger.error(error, error?.stack);
            throw error;
          }),
        )
        .pipe(
          map(
            (response) =>
              response.data.filter(
                ({ recipient_id }) => recipient_id === userName,
              )?.[0]?.text || null,
          ),
        ),
    );
  }

  public async parseFromRasa(user_prompt: string, config: IConfig) {
    return await firstValueFrom(
      this.httpService
        .post(config.rasa_host_url + '/model/parse', { text: user_prompt })
        .pipe(
          catchError((error) => {
            this.logger.error(error, error?.stack);
            throw error;
          }),
        )
        .pipe(map((response) => response.data?.intent || null)),
    );
  }
}
