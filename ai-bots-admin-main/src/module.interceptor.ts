import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).slice(1);
}

@Injectable()
export class NamedModuleInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const moduleName = camelToSnake(
      context.getClass().name.slice(0, -'controller'.length),
    );

    return next
      .handle()
      .pipe(
        map(
          (v) =>
            ((!v && (v = {}) && false) ||
              typeof v !== 'object' ||
              (v.module = moduleName)) &&
            v,
        ),
      );
  }
}
