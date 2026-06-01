import { Module } from "@nestjs/common";
import { CommonService } from "./common.service";
import { ThrottlerModule } from "./throttler/throttler.module";
import { CacheModule } from "./cache/cache.module";
import { MailModule } from "./mail/mail.module";
import { I18nModule } from "./i18n/i18n.module";

@Module({
	providers: [CommonService],
	exports: [CommonService],
	imports: [ThrottlerModule, CacheModule, MailModule, I18nModule],
})
export class CommonModule {}
