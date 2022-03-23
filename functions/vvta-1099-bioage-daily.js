module.exports = {
    logic: function ({ headers }, { data }) {
        // logic need not have any statements
    },
    request: {
        method: "GET",
        urlPath: "/api/v1/daily-statistic/bioage/daily",
    },
    response: {
        status: 200,
        bodyFileName: "vvta-1099-bioage-daily.json",
    },
};
