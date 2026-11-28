import { Global, Module } from '@nestjs/common';

import { RandomnessService } from './randomness.service';

@Global()
@Module({ providers: [RandomnessService], exports: [RandomnessService] })
export class RandomnessModule {}
