

import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
    Image,
} from "@react-pdf/renderer";

// Register fonts for different languages?
// For now we will use standard fonts, later maybe add custom ones for Arabic/Hebrew if needed.
// Note: Basic fonts might not support Arabic/Hebrew characters correctly without specific configuration.
// We might need to register a font that supports these scripts.
// Font.register({
//   family: "Open Sans",
//   src: "https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf",
// });

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: "Helvetica", // Default, might need change for Ar/He
        fontSize: 10,
        color: "#333",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 40,
    },
    logo: {
        width: 100,
        height: 50, // Approximate
        backgroundColor: "#ccc", // Placeholder
    },
    companyInfo: {
        textAlign: "right",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#111",
    },
    metaData: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        paddingBottom: 10,
    },
    billTo: {
        width: "45%",
    },
    invoiceDetails: {
        width: "45%",
        textAlign: "right",
    },
    table: {
        width: "100%",
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        backgroundColor: "#f9f9f9",
        padding: 8,
        fontWeight: "bold",
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        padding: 8,
    },
    colDesc: { flex: 3 },
    colQty: { flex: 1, textAlign: "center" },
    colPrice: { flex: 1, textAlign: "right" },
    colTotal: { flex: 1, textAlign: "right" },

    totals: {
        alignItems: "flex-end",
        marginTop: 20,
    },
    totalRow: {
        flexDirection: "row",
        marginBottom: 5,
        width: "40%",
        justifyContent: "space-between",
    },
    totalLabel: {
        fontWeight: "bold",
    },
    grandTotal: {
        flexDirection: "row",
        marginTop: 10,
        borderTopWidth: 2,
        borderTopColor: "#000",
        paddingTop: 5,
        width: "40%",
        justifyContent: "space-between",
    },
    footer: {
        position: "absolute",
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: "center",
        color: "#999",
        fontSize: 8,
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingTop: 10,
    },
});

interface InvoiceItem {
    description: string;
    quantity: number;
    price: number;
    total: number;
}

interface InvoiceTemplateProps {
    invoiceNumber: string;
    issueDate: string;
    dueDate?: string;
    clientName: string;
    clientAddress?: string;
    items: InvoiceItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    currency?: string;
    language?: string; // 'en' | 'ar' | 'he'
}

export const InvoiceTemplate = ({
    invoiceNumber,
    issueDate,
    dueDate,
    clientName,
    clientAddress,
    items,
    subtotal,
    taxRate,
    taxAmount,
    total,
    currency = "USD",
    language = "en",
}: InvoiceTemplateProps) => {
    const isRTL = language === "ar" || language === "he";

    // Note: For real RTL support in react-pdf we might need more complex setup 
    // (e.g. reversing text manually or using specific fonts/props).
    // For now using standard layout.

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        {/* Replace with actual Logo Image if available */}
                        <Text style={{ fontSize: 20, fontWeight: "bold" }}>PAXALA</Text>
                        <Text>Media Production</Text>
                    </View>
                    <View style={styles.companyInfo}>
                        <Text>Paxala Media Production</Text>
                        <Text>123 Studio Lane</Text>
                        <Text>City, Country</Text>
                        <Text>contact@paxalamedia.com</Text>
                    </View>
                </View>

                <Text style={styles.title}>INVOICE</Text>

                {/* Meta Data */}
                <View style={styles.metaData}>
                    <View style={styles.billTo}>
                        <Text style={{ fontWeight: "bold", marginBottom: 5 }}>Bill To:</Text>
                        <Text>{clientName}</Text>
                        {clientAddress && <Text>{clientAddress}</Text>}
                    </View>
                    <View style={styles.invoiceDetails}>
                        <Text>Invoice #: {invoiceNumber}</Text>
                        <Text>Date: {issueDate}</Text>
                        {dueDate && <Text>Due Date: {dueDate}</Text>}
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colDesc}>Description</Text>
                        <Text style={styles.colQty}>Qty</Text>
                        <Text style={styles.colPrice}>Price</Text>
                        <Text style={styles.colTotal}>Total ({currency})</Text>
                    </View>
                    {items.map((item, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={styles.colDesc}>{item.description}</Text>
                            <Text style={styles.colQty}>{item.quantity}</Text>
                            <Text style={styles.colPrice}>{item.price.toFixed(2)}</Text>
                            <Text style={styles.colTotal}>{item.total.toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totals}>
                    <View style={styles.totalRow}>
                        <Text>Subtotal:</Text>
                        <Text>{subtotal.toFixed(2)} {currency}</Text>
                    </View>
                    {taxRate > 0 && (
                        <View style={styles.totalRow}>
                            <Text>Tax ({taxRate}%):</Text>
                            <Text>{taxAmount.toFixed(2)} {currency}</Text>
                        </View>
                    )}
                    <View style={styles.grandTotal}>
                        <Text style={styles.totalLabel}>Total:</Text>
                        <Text style={styles.totalLabel}>{total.toFixed(2)} {currency}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Thank you for your business!</Text>
                    <Text>Payment Terms: Due on receipt unless otherwise specified.</Text>
                </View>
            </Page>
        </Document>
    );
};
