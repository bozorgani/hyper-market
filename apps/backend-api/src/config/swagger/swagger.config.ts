import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  // The full API map must not be publicly exposed in production. Allow an
  // explicit opt-in via SWAGGER_ENABLED=true; otherwise disable in prod.
  const explicitlyEnabled = process.env.SWAGGER_ENABLED === 'true';
  const explicitlyDisabled = process.env.SWAGGER_ENABLED === 'false';
  const isProduction = process.env.APP_ENV === 'production';

  if (explicitlyDisabled || (isProduction && !explicitlyEnabled)) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Hyper Market API')
    .setDescription('Hyper Market API documentation')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/docs', app, document);
}
