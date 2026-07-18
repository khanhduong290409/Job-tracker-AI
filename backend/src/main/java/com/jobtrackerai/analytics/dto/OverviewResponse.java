package com.jobtrackerai.analytics.dto;

/**
 * US-ANALYTICS-001 — 4 ô số tổng quan đầu trang Dashboard.
 * Tất cả tính theo userId hiện tại (ownership ở service layer).
 *
 * - offerRate = totalOffers / totalApplications (0.0–1.0), FE tự format %.
 * - avgResponseTimeDays: Double nullable — chưa có đơn nào được phản hồi → null (không phải 0).
 * - comparedToLastMonth: so tháng này với tháng trước, string sẵn dấu ("+15%", "+1", "0") để FE hiển thị thẳng.
 */
public record OverviewResponse(
        long totalApplications,
        long activeApplications,
        long totalOffers,
        double offerRate,//tỉ lệ nhận được offer
        Double avgResponseTimeDays,//Trung bình số ngày từ lúc nộp đến lúc có phản hồi đầu tiên từ nhà tuyển dụng(lần đổi status đầu tiên)
        //Double # double ở chỗ Double là object bọc quanh kiểu dữ liệu nguyên thuỷ double cho phép nó null trong khi double thì không thể
        MonthComparison comparedToLastMonth
) {

    public record MonthComparison(
            String applications,//% chênh lệch số đơn tháng này với tháng trước
            String offers//số offer chênh lệch của tháng này so với tháng trước
    ) {}
    /*
/So sánh tháng này với tháng trước — cho biết bạn đang tăng tốc hay chững lại. Gồm 2 chuỗi:

applications — thay đổi số đơn nộp: VD tháng này 12 đơn, tháng trước ~10 → "+15%"
offers — thay đổi số offer: VD tháng này 2, tháng trước 1 → "+1"
Để String sẵn dấu vì logic tính % + format dấu (+/-/0) gom ở backend, FE chỉ việc in ra.
    */
}
