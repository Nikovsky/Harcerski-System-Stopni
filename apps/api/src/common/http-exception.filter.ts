import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const status = exception.getStatus();
    const body = exception.getResponse() as any;

    res.status(status).json({
      statusCode: status,
      message: body?.message ?? 'Error',
      path: req.url,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
