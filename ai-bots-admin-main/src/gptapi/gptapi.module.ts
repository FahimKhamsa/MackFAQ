import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module, ModuleMetadata, Provider } from '@nestjs/common';
import { GptapiService } from './gptapi.service';
import { IGptApiConfig } from './gptapiconfig.constants';

interface GptApiModuleConfig extends Pick<ModuleMetadata, 'imports'> {
  paramsFactory: (...args: any[]) => Promise<IGptApiConfig>,
  inject?: any[]
}

@Module({
  providers: [GptapiService],
  exports: [GptapiService],
  imports: [HttpModule],
})
export class GptapiModule {
  static config(config: GptApiModuleConfig): DynamicModule {
    return {
      module: GptapiModule,
      imports: config.imports,
      exports: [GptapiService],
      providers: [
        GptapiService, 
        {
          provide: 'GPT_API_CONFIG',
          useFactory: config.paramsFactory,
          inject: config.inject || [],
        }
      ]
    }
  }
}
