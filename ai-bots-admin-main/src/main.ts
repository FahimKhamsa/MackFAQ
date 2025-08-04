import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { existsSync, mkdirSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, extname, basename } from 'path';
import { AppModule } from './app.module';
import * as hbs from 'hbs';
import { ValidationPipe } from '@nestjs/common';
import { readdirSync, readFileSync } from 'fs';
import { OnUnauthorizedExceptionFilter } from './on-unauthorized-exception/on-unauthorized-exception.filter';

/**
 * Ensures required directories exist for the application
 * Creates them if they don't exist to prevent runtime errors
 */
function ensureRequiredDirectories() {
  const requiredDirectories = [
    process.env.CONVERSATIONS_FOLDER_PATH || 'conversations/',
    process.env.CONVERSATIONS_METADATA_FOLDER_PATH || 'conversations-metadata/',
    process.env.PUBLIC_FILES_STORAGE || 'storage/',
    (process.env.PUBLIC_FILES_STORAGE || 'storage/') + 'uploads/',
  ];

  requiredDirectories.forEach((dir) => {
    if (!existsSync(dir)) {
      try {
        mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      } catch (error) {
        console.error(`❌ Failed to create directory ${dir}:`, error.message);
        // Don't throw error - let the app continue and fail gracefully later if needed
      }
    } else {
      console.log(`✅ Directory already exists: ${dir}`);
    }
  });
}

async function bootstrap() {
  // Initialize required directories before starting the application
  console.log('🔧 Initializing required directories...');
  ensureRequiredDirectories();
  console.log('🚀 Starting NestJS application...');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new OnUnauthorizedExceptionFilter());

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');
  app.set('view options', { layout: 'layouts/default' });
  registerPartials(hbs, 'views');
  registerHelpers(hbs);
  await app.listen(process.env.PORT || 3000);
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
function caseSwap(string) {
  return string
    .split('-')
    .map((v, i) => (i == 0 && v) || capitalizeFirstLetter(v))
    .join('');
}
function reduceIndex(string) {
  return string === 'index' ? '' : string;
}
function formatSegment(string, only_case_check = false) {
  if (only_case_check) return caseSwap(string);
  return caseSwap(capitalizeFirstLetter(reduceIndex(string)));
}
function registerHelpers(hbs) {
  hbs.registerHelper('escape', function (variable) {
    return (variable || '').replace(/\r\n/g, '\n').replace(/(['"])/g, '\\$1');
  });
  hbs.registerHelper('select', function (selected, options) {
    return options
      .fn(this)
      .replace(
        new RegExp(' value="' + selected + '"'),
        '$& selected="selected"',
      );
  });
  hbs.registerHelper(
    'selectFromList',
    function (matchKey, matchValue, options, key) {
      return options.filter((v) => v[matchKey] === matchValue)?.[0]?.[key];
    },
  );
  hbs.registerHelper(
    'paginationFooter',
    function (payload: { totalPages: number; page: number }, url: string) {
      const prev =
        payload.page >= 1
          ? `<a  href="/${
              url + '?page=' + (payload.page - 1).toString()
            }" >Prev</a>`
          : '';
      const next =
        payload.page + 1 < payload.totalPages
          ? `<a  href="/${
              url + '?page=' + (payload.page + 1).toString()
            }" >Next</a>`
          : '';
      return prev + next;
    },
  );
  hbs.registerHelper('nav-panel', function (current_page, options) {
    return options
      .fn(this)
      .replace(new RegExp('nav-item-' + current_page + '', 'g'), '$& active');
  });
  hbs.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
      case '==':
        return v1 == v2 ? options.fn(this) : options.inverse(this);
      case '===':
        return v1 === v2 ? options.fn(this) : options.inverse(this);
      case '!=':
        return v1 != v2 ? options.fn(this) : options.inverse(this);
      case '!==':
        return v1 !== v2 ? options.fn(this) : options.inverse(this);
      case '<':
        return v1 < v2 ? options.fn(this) : options.inverse(this);
      case '<=':
        return v1 <= v2 ? options.fn(this) : options.inverse(this);
      case '>':
        return v1 > v2 ? options.fn(this) : options.inverse(this);
      case '>=':
        return v1 >= v2 ? options.fn(this) : options.inverse(this);
      case '&&':
        return v1 && v2 ? options.fn(this) : options.inverse(this);
      case '||':
        return v1 || v2 ? options.fn(this) : options.inverse(this);
      default:
        return options.inverse(this);
    }
  });
}
function registerPartials(hbs, folder) {
  const partialsFolder = join(__dirname, '..', folder);
  readdirSync(partialsFolder).reduce((result, partial) => {
    const ext = extname(partial);
    if (!ext) {
      registerPartials(hbs, folder + '/' + partial);
      return;
    }
    const fileFullPath = join(partialsFolder, partial);
    const data = readFileSync(fileFullPath, 'utf-8');
    // Store as `"filename without extension": content`.
    const name =
      folder
        .split('/')
        .slice(1)
        .map((v, i) => formatSegment(v, i == 0))
        .join('') + formatSegment(basename(partial, ext));

    hbs.registerPartial(name, data);
    return result;
  }, {});
}

bootstrap();
