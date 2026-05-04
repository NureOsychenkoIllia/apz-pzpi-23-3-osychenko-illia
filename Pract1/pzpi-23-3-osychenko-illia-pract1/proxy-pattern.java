// Demonstration of the Proxy (Заступник) design pattern
// Pattern type: Structural
// Source: E. Gamma et al. "Design Patterns: Elements of Reusable Object-Oriented Software" (GoF)

// ─────────────────────────────────────────────────────────────────────────────
// Subject — спільний інтерфейс для реального об'єкта та заступника
// ─────────────────────────────────────────────────────────────────────────────
interface Image {
    void display();
    String getFilename();
}

// ─────────────────────────────────────────────────────────────────────────────
// RealSubject — реальний об'єкт із ресурсоємною операцією завантаження
// ─────────────────────────────────────────────────────────────────────────────
class RealImage implements Image {
    private final String filename;

    public RealImage(String filename) {
        this.filename = filename;
        loadFromDisk();
    }

    private void loadFromDisk() {
        System.out.println("  [RealImage] Завантаження зображення з диска: " + filename);
    }

    @Override
    public void display() {
        System.out.println("  [RealImage] Відображення зображення: " + filename);
    }

    @Override
    public String getFilename() {
        return filename;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Proxy (Заступник) — контролює доступ до реального об'єкта,
// реалізує відкладену ініціалізацію (Virtual Proxy)
// ─────────────────────────────────────────────────────────────────────────────
class ProxyImage implements Image {
    private final String filename;
    private RealImage realImage; // null до першого звернення

    public ProxyImage(String filename) {
        this.filename = filename;
    }

    @Override
    public void display() {
        if (realImage == null) {
            realImage = new RealImage(filename); // відкладена ініціалізація
        }
        realImage.display();
    }

    @Override
    public String getFilename() {
        return filename;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client — взаємодіє з об'єктами лише через інтерфейс Image
// ─────────────────────────────────────────────────────────────────────────────
public class ProxyPatternDemo {
    public static void main(String[] args) {
        System.out.println("=== Демонстрація патерна «Заступник» (Proxy) ===\n");

        // Клієнт отримує Proxy-об'єкти — завантаження не відбувається
        Image image1 = new ProxyImage("landscape.jpg");
        Image image2 = new ProxyImage("portrait.jpg");
        System.out.println("Створено ProxyImage-об'єкти (зображення ще не завантажені).\n");

        // Перший виклик — відкладена ініціалізація: завантаження та відображення
        System.out.println("Перший виклик image1.display():");
        image1.display();

        // Повторний виклик — лише відображення (без повторного завантаження)
        System.out.println("\nДругий виклик image1.display():");
        image1.display();

        // Перший виклик для image2 — окреме завантаження та відображення
        System.out.println("\nПерший виклик image2.display():");
        image2.display();
    }
}

/*
 * Очікуваний вивід:
 *
 * === Демонстрація патерна «Заступник» (Proxy) ===
 *
 * Створено ProxyImage-об'єкти (зображення ще не завантажені).
 *
 * Перший виклик image1.display():
 *   [RealImage] Завантаження зображення з диска: landscape.jpg
 *   [RealImage] Відображення зображення: landscape.jpg
 *
 * Другий виклик image1.display():
 *   [RealImage] Відображення зображення: landscape.jpg
 *
 * Перший виклик image2.display():
 *   [RealImage] Завантаження зображення з диска: portrait.jpg
 *   [RealImage] Відображення зображення: portrait.jpg
 */
