-- Виправлення реалістичних даних: ціна пального та аналітика рейсів
-- fuel_cost_per_km використовується як ціна пального за літр у формулі:
-- fuel_cost = distance_km * fuel_consumption_per_100km / 100 * fuel_cost_per_km
-- При 4.50 грн/л рейс Харків-Київ (480км, 12.5л/100км) коштує лише 270 грн пального
-- Реалістична ціна дизелю ~55 грн/л → 480 * 12.5/100 * 55 = 3300 грн

UPDATE routes SET fuel_cost_per_km = 55.00;

-- Видаляємо стару аналітику для рейсів останнього тижня (з 005_rich_demo_data.sql)
-- щоб вона перерахувалась з правильними витратами при наступному виклику
DELETE FROM trip_analytics
WHERE trip_id IN (
    SELECT id FROM trips
    WHERE scheduled_departure >= NOW() - INTERVAL '8 days'
    AND status = 'completed'
);

-- Вставляємо реалістичну аналітику для рейсів останнього тижня
-- Маршрут 1: Харків-Київ (480км, bus capacity 50)
--   fuel_cost = 480 * 12.5/100 * 55 = 3300 грн
--   driver_cost = 800 грн, other = 200 грн → total_costs ≈ 4300 грн
--   40 пасажирів * 165 грн = 6600 грн → profitability ≈ 53%
-- Маршрут 2: Київ-Одеса (475км, bus capacity 35)
--   fuel_cost = 475 * 11.8/100 * 55 = 3083 грн
--   driver_cost = 900 грн, other = 200 грн → total_costs ≈ 4183 грн
--   28 пасажирів * 185 грн = 5180 грн → profitability ≈ 24%
-- Маршрут 3: Харків-Дніпро (215км, bus capacity 45)
--   fuel_cost = 215 * 13.2/100 * 55 = 1560 грн
--   driver_cost = 600 грн, other = 150 грн → total_costs ≈ 2310 грн
--   32 пасажири * 90 грн = 2880 грн → profitability ≈ 25%

INSERT INTO trip_analytics (
    trip_id, total_passengers, max_passengers, avg_occupancy_rate,
    revenue, fuel_cost, driver_cost, other_costs, profit, profitability_percent, calculated_at
)
SELECT
    t.id,
    CASE
        WHEN t.route_id = 1 THEN 38 + (random() * 10)::int   -- 38-48 з 50
        WHEN t.route_id = 2 THEN 22 + (random() * 10)::int   -- 22-32 з 35
        ELSE 28 + (random() * 12)::int                        -- 28-40 з 45
    END AS total_passengers,
    CASE
        WHEN t.route_id = 1 THEN 50
        WHEN t.route_id = 2 THEN 35
        ELSE 45
    END AS max_passengers,
    CASE
        WHEN t.route_id = 1 THEN 0.76 + (random() * 0.20)    -- 0.76-0.96 (fraction, not percent)
        WHEN t.route_id = 2 THEN 0.63 + (random() * 0.25)    -- 0.63-0.88
        ELSE 0.62 + (random() * 0.27)                         -- 0.62-0.89
    END AS avg_occupancy_rate,
    CASE
        WHEN t.route_id = 1 THEN (38 + (random() * 10)::int) * (155 + (random() * 30)::int)
        WHEN t.route_id = 2 THEN (22 + (random() * 10)::int) * (175 + (random() * 25)::int)
        ELSE (28 + (random() * 12)::int) * (82 + (random() * 18)::int)
    END AS revenue,
    CASE
        WHEN t.route_id = 1 THEN 3200.00 + (random() * 200)  -- ~3300 грн
        WHEN t.route_id = 2 THEN 2950.00 + (random() * 200)  -- ~3083 грн
        ELSE 1480.00 + (random() * 150)                       -- ~1560 грн
    END AS fuel_cost,
    CASE
        WHEN t.route_id = 1 THEN 800.00
        WHEN t.route_id = 2 THEN 900.00
        ELSE 600.00
    END AS driver_cost,
    CASE
        WHEN t.route_id = 1 THEN 180.00 + (random() * 50)
        WHEN t.route_id = 2 THEN 190.00 + (random() * 50)
        ELSE 140.00 + (random() * 40)
    END AS other_costs,
    0 AS profit,
    0 AS profitability_percent,
    t.actual_arrival + INTERVAL '30 minutes' AS calculated_at
FROM trips t
WHERE t.status = 'completed'
  AND t.scheduled_departure >= NOW() - INTERVAL '8 days'
  AND NOT EXISTS (SELECT 1 FROM trip_analytics ta WHERE ta.trip_id = t.id);

-- Перераховуємо profit та profitability_percent
UPDATE trip_analytics ta
SET
    profit = revenue - fuel_cost - driver_cost - other_costs,
    profitability_percent = ROUND(
        LEAST(
            GREATEST(
                ((revenue - fuel_cost - driver_cost - other_costs)
                 / NULLIF(fuel_cost + driver_cost + other_costs, 0) * 100),
                -9999.99
            ),
            9999.99
        )::numeric,
        1
    )
WHERE EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = ta.trip_id
      AND t.scheduled_departure >= NOW() - INTERVAL '8 days'
);
