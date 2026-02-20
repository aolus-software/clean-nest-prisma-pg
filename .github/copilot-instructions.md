# GitHub Copilot Instructions

## Role and Context

You are acting as a senior NestJS developer with expertise in:

- NestJS framework with Fastify adapter
- Bun runtime environment
- Prisma ORM with PostgreSQL
- Redis for caching
- BullMQ for job queues
- Passport.js with JWT strategy

## Code Style Requirements

### No Icons Policy

Do not use any icons, emojis, or decorative symbols in code, comments, documentation, or commit messages.

### Comment Style

- Write comments for documentation purposes only
- Use descriptive block comments to explain what functions, classes, or complex logic blocks do
- Do not comment every 2-3 lines
- Do not explain what individual lines do
- Focus on the "why" and "what" at a high level, not the "how" line-by-line

Example of good commenting:

```typescript
/**
 * Validates user credentials against the database and issues JWT tokens.
 * Clears existing cache before refreshing user information.
 */
async login(data: LoginDto): Promise<LoginResult> {
  // implementation
}
```

Example of bad commenting (avoid this):

```typescript
// Find user by email
const user = await UserRepository().findByMail(data.email);
// Check if user exists
if (!user) {
  // Throw error
  throw new UnprocessableEntityException({ ... });
}
```

### Documentation Policy

- Do not create separate documentation files, README updates, or change logs unless explicitly requested
- Provide a brief summary in chat when asked
- Keep responses concise and focused on the code implementation

## Project Structure

```
src/
  app.module.ts         - Root module
  main.ts               - Application bootstrap
  auth/                 - Auth module (controller, service, DTOs)
  settings/             - Settings module (users, roles, permissions)
  health/               - Health check module
prisma/
  schema.prisma         - Prisma schema definition
  seed/                 - Database seed scripts
libs/
  common/src/           - Shared utilities
    cache/              - CacheService
    decorators/         - CurrentUser, RoleAuth, PermissionAuth, ApiStandardResponses
    guards/             - AuthGuard, RoleGuard, PermissionGuard
    interceptors/       - FileUpload interceptors
    mail/               - MailService
    pipes/              - Validation pipes
    response/           - ResponseHandler
    strategies/         - Passport JWT strategy
    throttler/          - Rate limiting
    types/              - Shared TypeScript types
  repositories/src/     - Database layer
    prisma/             - PrismaService
    repositories/       - UserRepository, RoleRepository, PermissionRepository
  utils/src/            - Utility functions
    hash/               - HashUtils
    jwt/                - JWTUtils
    date/               - DateUtils
    string/             - StrUtils
    logger/             - LoggerUtils
    encryption/         - EncryptionUtils
```

## Path Aliases

Use the configured tsconfig path aliases for imports:

```typescript
import { CacheService, MailService, UserCache, AuthGuard, CurrentUser, ResponseHandler } from "@common";
import { UserRepository, UserInformation, prisma } from "@repositories";
import { HashUtils, JWTUtils, DateUtils, StrUtils, LoggerUtils } from "@utils";
```

**Available aliases:**
- `@common` - Shared NestJS providers (guards, decorators, interceptors, response, cache, mail)
- `@repositories` - Database access layer (repositories, `prisma` client instance)
- `@utils` - Utility functions (hash, jwt, date, string, logger, encryption)
- `@generated/*` - Prisma generated types

## NestJS Patterns

### Controller Pattern

Controllers should be thin and delegate all business logic to services:

```typescript
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("/login")
  @ApiResponse({ status: 200, description: "Login successful", schema: { ... } })
  @ApiStandardResponses({ unauthorized: false, forbidden: false })
  async login(@Body() data: LoginDto, @Res() res: FastifyReply) {
    try {
      const result = await this.authService.login(data);
      return res.status(200).send(
        ResponseHandler.success(200, "Login successful", result),
      );
    } catch (error) {
      ResponseHandler.handleError(res, error);
    }
  }

  @Get("/profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("Bearer")
  @ApiStandardResponses({ forbidden: false })
  profile(@Res() res: FastifyReply, @CurrentUser() user: UserInformation) {
    try {
      return res.status(200).send(
        ResponseHandler.success(200, "Profile fetched successfully", user),
      );
    } catch (error) {
      ResponseHandler.handleError(res, error);
    }
  }
}
```

### Service Pattern

Services use `@Injectable()` and receive dependencies via constructor injection:

```typescript
@Injectable()
export class AuthService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
  ) {}

  async login(data: LoginDto): Promise<{ user: UserInformation; accessToken: string; refreshToken: string }> {
    const user = await UserRepository().findByMail(data.email);
    if (!user) {
      throw new UnprocessableEntityException({
        message: "Invalid email or password",
        error: { email: ["Invalid email or password"] },
      });
    }
    // implementation
  }
}
```

### Module Pattern

```typescript
@Module({
  imports: [CommonModule, RepositoriesModule, UtilsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
```

### DTO Pattern

Use class-validator decorators for validation:

```typescript
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @Matches(StrongPassword)
  password: string;
}
```

### Error Handling

Use NestJS built-in HTTP exceptions. Prefer `UnprocessableEntityException` for validation-related business errors:

```typescript
throw new UnprocessableEntityException({
  message: "Email already in use",
  error: {
    email: ["Email already in use"],
  },
});

throw new UnauthorizedException("Unauthorized access");
throw new NotFoundException("Resource not found");
throw new ForbiddenException("Access forbidden");
```

Always use `ResponseHandler.handleError(res, error)` in controllers to centralize error response formatting.

## Database Operations (Prisma ORM)

### Repository Pattern

Repositories export factory functions returning database access methods. Use the shared `prisma` client:

```typescript
export const UserRepository = () => {
  return {
    findByMail: async (email: string) => {
      return await prisma.user.findFirst({ where: { email } });
    },

    userInformation: async (id: string): Promise<UserInformation | null> => {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        },
      });
    },
  };
};
```

### Prisma Queries

```typescript
// Find one
const user = await prisma.user.findUnique({ where: { id: userId } });

// Find with relation
const user = await prisma.user.findFirst({
  where: { email },
  include: { userRoles: { include: { role: true } } },
});

// Create
const newUser = await prisma.user.create({
  data: { name, email, password: hashedPassword },
});

// Update
await prisma.user.update({
  where: { id: userId },
  data: { emailVerifiedAt: new Date() },
});
```

### Transactions

```typescript
await prisma.$transaction(async (tx) => {
  const newUser = await tx.user.create({ data: { ... } });
  await tx.emailVerification.create({
    data: { userId: newUser.id, token, expiresAt },
  });
});
```

### Schema Management

- Prisma schema is defined in `prisma/schema.prisma`
- Run `npx prisma migrate dev` to create and apply migrations
- Run `npx prisma generate` after schema changes to regenerate the client
- Seed scripts are in `prisma/seed/`

## Response Handling

Use `ResponseHandler` from `@common` for all responses:

```typescript
// Success
ResponseHandler.success(200, "Operation successful", data);
ResponseHandler.success(201, "Created successfully", null);

// Error (centralized)
ResponseHandler.handleError(res, error);
```

## Caching

Use `CacheService` injected via constructor:

```typescript
// Set cache (null TTL = no expiry)
await this.cacheService.set<UserInformation>(UserCache(user.id), userInformation, null);

// Get cache
const cached = await this.cacheService.get<UserInformation>(UserCache(user.id));

// Delete cache
await this.cacheService.del(UserCache(user.id));
```

## Security

Use utilities from `@utils` for hashing and JWT:

```typescript
const hashed = await HashUtils.generateHash(password);
const isValid = await HashUtils.compareHash(plaintext, hashed);

const accessToken = JWTUtils.generateAccessToken({ sub: user.id });
const refreshToken = JWTUtils.generateRefreshToken({ sub: user.id });
```

Apply guards with decorators:

```typescript
@UseGuards(AuthGuard)                          // JWT authentication
@UseGuards(RoleGuard("admin"))                 // Role-based access
@UseGuards(PermissionGuard("users:read"))      // Permission-based access
```

## Queue and Background Jobs

Define queues and workers using BullMQ with `@nestjs/bullmq`:

```typescript
// Queue registration in module
BullModule.registerQueue({ name: "send-email" })

// Producer
@InjectQueue("send-email")
private readonly sendMailQueue: Queue

await this.sendMailQueue.add("send", { to, subject, template, context });

// Consumer
@Processor("send-email")
export class SendMailWorker {
  @Process("send")
  async handleSend(job: Job<EmailOptions>) {
    // implementation
  }
}
```

## Swagger Documentation

Use `@nestjs/swagger` decorators on all controllers:

```typescript
@ApiResponse({ status: 200, description: "Success", schema: { ... } })
@ApiStandardResponses({ unauthorized: false, forbidden: false })  // custom decorator from @common
@ApiBearerAuth("Bearer")  // for protected endpoints
```

## Logging

Use `LoggerUtils` from `@utils`:

```typescript
import { LoggerUtils } from "@utils";

LoggerUtils.log("User logged in", { userId });
LoggerUtils.warn("Warning occurred", { context });
LoggerUtils.error("Error occurred", error);
```

## Configuration

- Use `@nestjs/config` for environment variables
- Keep secrets in environment variables, never hardcoded
- Validate required env vars at startup

## Code Organization

- Keep controllers thin, delegate all business logic to services
- Use repository pattern for all database access
- Services have single responsibility
- Use TypeScript strict mode
- Prefer async/await over promises
- Avoid `any` type; use proper types or `unknown` with type guards
- No `console.log` in production code, use `LoggerUtils` instead
- Handle all errors explicitly, no silent failures
- Follow clean architecture: controllers -> services -> repositories

## File Naming

- `auth.controller.ts` - Controller files
- `auth.service.ts` - Service files
- `auth.module.ts` - Module files
- `login.dto.ts` - DTO files (kebab-case)
- `user.repository.ts` - Repository files

## Expected Behavior

When generating code:

1. Follow the existing NestJS module structure in `src/`
2. Use `@common`, `@repositories`, `@utils` path aliases for all imports
3. Use `ResponseHandler` for all HTTP responses in controllers
4. Use `UnprocessableEntityException` for business validation errors
5. Apply `@ApiResponse` and `@ApiStandardResponses` to all controller methods
6. Use Prisma client (`prisma`) for database operations via repositories
7. Inject services via NestJS constructor injection
8. Write minimal but meaningful comments
