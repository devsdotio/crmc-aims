import { ReportController } from "./report.controller";
import { ReportRepository } from "./report.repository";
import { ReportService } from "./report.service";

export * from "./report.types";
export * from "./report.validation";
export { ReportRepository, ReportService, ReportController };

export const reportRepository = new ReportRepository();
export const reportService = new ReportService(reportRepository);
export const reportController = new ReportController(reportService);
