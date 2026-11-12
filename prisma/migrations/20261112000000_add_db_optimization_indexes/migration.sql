-- CreateIndex
CREATE INDEX "idx_email_verification_user_id_used_at" ON "EmailVerification"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "idx_reset_password_user_id_used_at" ON "ResetPassword"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "idx_role_permission_permission_id" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "idx_user_email_live_unique" ON "User"("email") WHERE ("deletedAt" IS NULL);

-- CreateIndex
CREATE INDEX "idx_user_role_role_id" ON "UserRole"("roleId");

