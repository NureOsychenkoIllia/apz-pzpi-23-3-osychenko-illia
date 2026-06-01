-- Додаємо кілька збиткових прикладів у демо-аналітику.
-- Окрема міграція потрібна, щоб зміна застосовувалась і на БД,
-- де попередні демо-сіди вже були виконані.

WITH recent_route3_trips AS (
    SELECT
        ta.id AS analytics_id,
        ta.trip_id,
        ROW_NUMBER() OVER (ORDER BY t.scheduled_departure ASC) AS rn
    FROM trip_analytics ta
    JOIN trips t ON t.id = ta.trip_id
    WHERE t.route_id = 3
      AND t.status = 'completed'
      AND t.scheduled_departure >= NOW() - INTERVAL '8 days'
)
UPDATE trip_analytics ta
SET
    total_passengers = CASE recent_route3_trips.rn
        WHEN 1 THEN 18
        ELSE 21
    END,
    max_passengers = 45,
    avg_occupancy_rate = CASE recent_route3_trips.rn
        WHEN 1 THEN 0.40
        ELSE 0.47
    END,
    revenue = CASE recent_route3_trips.rn
        WHEN 1 THEN 1790.00
        ELSE 2075.00
    END,
    fuel_cost = CASE recent_route3_trips.rn
        WHEN 1 THEN 1585.00
        ELSE 1640.00
    END,
    driver_cost = 600.00,
    other_costs = CASE recent_route3_trips.rn
        WHEN 1 THEN 165.00
        ELSE 180.00
    END,
    profit = CASE recent_route3_trips.rn
        WHEN 1 THEN 1790.00 - 1585.00 - 600.00 - 165.00
        ELSE 2075.00 - 1640.00 - 600.00 - 180.00
    END,
    profitability_percent = CASE recent_route3_trips.rn
        WHEN 1 THEN ROUND((((1790.00 - 1585.00 - 600.00 - 165.00) / (1585.00 + 600.00 + 165.00)) * 100)::numeric, 1)
        ELSE ROUND((((2075.00 - 1640.00 - 600.00 - 180.00) / (1640.00 + 600.00 + 180.00)) * 100)::numeric, 1)
    END,
    calculated_at = NOW()
FROM recent_route3_trips
WHERE ta.id = recent_route3_trips.analytics_id;
