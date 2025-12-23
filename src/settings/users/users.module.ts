import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { MailModule } from "@common";

@Module({
	controllers: [UsersController],
	providers: [UsersService],
	imports: [MailModule],
})
export class UsersModule {}
