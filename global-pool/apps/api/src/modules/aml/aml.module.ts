import { Global, Module } from '@nestjs/common';

import { AmlService } from './aml.service';

@Global()
@Module({ providers: [AmlService], exports: [AmlService] })
export class AmlModule {}
