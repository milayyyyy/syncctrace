-- DropForeignKey
ALTER TABLE "FacultyGroup" DROP CONSTRAINT "FacultyGroup_advisorId_fkey";

-- DropForeignKey
ALTER TABLE "Artifact" DROP CONSTRAINT "Artifact_groupId_fkey";

-- DropForeignKey
ALTER TABLE "TraceabilityLink" DROP CONSTRAINT "TraceabilityLink_upstreamId_fkey";

-- DropForeignKey
ALTER TABLE "TraceabilityLink" DROP CONSTRAINT "TraceabilityLink_downstreamId_fkey";

-- DropForeignKey
ALTER TABLE "AuditResult" DROP CONSTRAINT "AuditResult_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Gap" DROP CONSTRAINT "Gap_auditResultId_fkey";

-- DropForeignKey
ALTER TABLE "ExportJob" DROP CONSTRAINT "ExportJob_userId_fkey";

-- DropForeignKey
ALTER TABLE "ExportJob" DROP CONSTRAINT "ExportJob_auditResultId_fkey";

-- AddForeignKey
ALTER TABLE "FacultyGroup" ADD CONSTRAINT "FacultyGroup_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FacultyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraceabilityLink" ADD CONSTRAINT "TraceabilityLink_upstreamId_fkey" FOREIGN KEY ("upstreamId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraceabilityLink" ADD CONSTRAINT "TraceabilityLink_downstreamId_fkey" FOREIGN KEY ("downstreamId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditResult" ADD CONSTRAINT "AuditResult_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FacultyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gap" ADD CONSTRAINT "Gap_auditResultId_fkey" FOREIGN KEY ("auditResultId") REFERENCES "AuditResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_auditResultId_fkey" FOREIGN KEY ("auditResultId") REFERENCES "AuditResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
