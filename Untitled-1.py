# ============================================
# ĐỒ ÁN: DỰ ĐOÁN NHU CẦU BẢO HIỂM XE
# HEALTH INSURANCE CROSS SELL PREDICTION
# ============================================


# ============================================
# 1. IMPORT THƯ VIỆN
# ============================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

from sklearn.metrics import classification_report
from sklearn.metrics import confusion_matrix
from sklearn.metrics import roc_auc_score
from sklearn.metrics import roc_curve

sns.set(style="whitegrid")


# ============================================
# 2. ĐỌC DỮ LIỆU
# ============================================

print("===== ĐỌC DỮ LIỆU =====")

df = pd.read_csv("train.csv")

print("\n5 dòng đầu của dữ liệu:")
print(df.head())


# ============================================
# 3. KIỂM TRA DỮ LIỆU
# ============================================

print("\n===== THÔNG TIN DỮ LIỆU =====")
print(df.info())

print("\n===== THỐNG KÊ MÔ TẢ =====")
print(df.describe())

print("\n===== KIỂM TRA GIÁ TRỊ THIẾU =====")
print(df.isnull().sum())

print("\n===== KIỂM TRA DỮ LIỆU TRÙNG =====")
print("Số dòng trùng:", df.duplicated().sum())


# ============================================
# 3. TRỰC QUAN DỮ LIỆU
# ============================================

# --------------------------------------------
# 3.1 Trực quan hóa số lượng
# --------------------------------------------

print("\n===== 3.1 TRỰC QUAN HÓA SỐ LƯỢNG =====")

plt.figure(figsize=(6,4))
sns.countplot(x="Response", data=df)
plt.title("Số lượng khách hàng mua và không mua bảo hiểm")
plt.show()

plt.figure(figsize=(6,4))
sns.countplot(x="Gender", data=df)
plt.title("Số lượng khách hàng theo giới tính")
plt.show()


# --------------------------------------------
# 3.2 Trực quan hóa phân phối
# --------------------------------------------

print("\n===== 3.2 PHÂN PHỐI DỮ LIỆU =====")

plt.figure(figsize=(6,4))
sns.histplot(df["Age"], kde=True)
plt.title("Phân phối độ tuổi khách hàng")
plt.show()

plt.figure(figsize=(6,4))
sns.histplot(df["Annual_Premium"], kde=True)
plt.title("Phân phối phí bảo hiểm")
plt.show()


# --------------------------------------------
# 3.3 Trực quan nhiều phân phối
# --------------------------------------------

print("\n===== 3.3 SO SÁNH NHIỀU PHÂN PHỐI =====")

plt.figure(figsize=(7,4))
sns.histplot(data=df, x="Age", hue="Response", kde=True, bins=30)
plt.title("So sánh phân phối tuổi giữa nhóm mua và không mua bảo hiểm")
plt.show()


# --------------------------------------------
# 3.4 Trực quan tỷ lệ
# --------------------------------------------

print("\n===== 3.4 TRỰC QUAN HÓA TỶ LỆ =====")

response_counts = df["Response"].value_counts()

plt.figure(figsize=(5,5))
plt.pie(response_counts,
        labels=["Không mua","Mua"],
        autopct="%1.1f%%")
plt.title("Tỷ lệ khách hàng mua bảo hiểm xe")
plt.show()


# --------------------------------------------
# 3.5 Nhóm tỷ lệ lồng nhau
# --------------------------------------------

print("\n===== 3.5 NHÓM TỶ LỆ LỒNG NHAU =====")

plt.figure(figsize=(6,4))
sns.barplot(x="Previously_Insured", y="Response", data=df)
plt.title("Đã có bảo hiểm trước đó vs Tỷ lệ mua")
plt.show()

plt.figure(figsize=(6,4))
sns.barplot(x="Vehicle_Damage", y="Response", data=df)
plt.title("Xe từng hư hỏng vs Tỷ lệ mua bảo hiểm")
plt.show()


# --------------------------------------------
# 3.6 Quan hệ biến định lượng
# --------------------------------------------

print("\n===== 3.6 MỐI QUAN HỆ BIẾN ĐỊNH LƯỢNG =====")

plt.figure(figsize=(6,4))
sns.scatterplot(x="Age", y="Annual_Premium", data=df)
plt.title("Mối quan hệ giữa tuổi và phí bảo hiểm")
plt.show()

plt.figure(figsize=(10,6))
sns.heatmap(df.corr(numeric_only=True), annot=True, cmap="coolwarm")
plt.title("Ma trận tương quan")
plt.show()


# ============================================
# 4. TIỀN XỬ LÝ DỮ LIỆU
# ============================================

print("\n===== TIỀN XỬ LÝ DỮ LIỆU =====")

df["Vehicle_Age"] = df["Vehicle_Age"].map({
    "< 1 Year":0,
    "1-2 Year":1,
    "> 2 Years":2
})

df["Vehicle_Damage"] = df["Vehicle_Damage"].map({
    "Yes":1,
    "No":0
})

df["Gender"] = df["Gender"].map({
    "Male":1,
    "Female":0
})


# ============================================
# 5. CHIA TRAIN TEST
# ============================================

print("\n===== CHIA DỮ LIỆU TRAIN / TEST =====")

X = df.drop(["id","Response"], axis=1)
y = df["Response"]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

print("Kích thước train:", X_train.shape)
print("Kích thước test:", X_test.shape)


# ============================================
# 6. MÔ HÌNH LOGISTIC REGRESSION
# ============================================

print("\n===== HUẤN LUYỆN LOGISTIC REGRESSION =====")

lr = LogisticRegression(max_iter=1000)

lr.fit(X_train, y_train)

y_pred_lr = lr.predict(X_test)

print("\nĐÁNH GIÁ LOGISTIC REGRESSION")

print(classification_report(
    y_test,
    y_pred_lr,
    target_names=["Không mua","Mua"]
))


# ============================================
# 7. RANDOM FOREST
# ============================================

print("\n===== HUẤN LUYỆN RANDOM FOREST =====")

rf = RandomForestClassifier()

rf.fit(X_train, y_train)

y_pred_rf = rf.predict(X_test)

print("\nĐÁNH GIÁ RANDOM FOREST")

print(classification_report(
    y_test,
    y_pred_rf,
    target_names=["Không mua","Mua"]
))


# ============================================
# 8. CONFUSION MATRIX
# ============================================

print("\n===== CONFUSION MATRIX =====")

cm = confusion_matrix(y_test, y_pred_rf)

sns.heatmap(cm,
            annot=True,
            fmt="d",
            cmap="Blues",
            xticklabels=["Không mua","Mua"],
            yticklabels=["Không mua","Mua"])

plt.xlabel("Dự đoán")
plt.ylabel("Thực tế")
plt.title("Ma trận nhầm lẫn")
plt.show()


# ============================================
# 9. ROC AUC
# ============================================

print("\n===== ROC AUC =====")

lr_auc = roc_auc_score(y_test, lr.predict_proba(X_test)[:,1])
rf_auc = roc_auc_score(y_test, rf.predict_proba(X_test)[:,1])

print("ROC Logistic Regression:", lr_auc)
print("ROC Random Forest:", rf_auc)


# ============================================
# 10. ROC CURVE
# ============================================

fpr, tpr, _ = roc_curve(y_test, rf.predict_proba(X_test)[:,1])

plt.plot(fpr, tpr, label="Random Forest")
plt.plot([0,1],[0,1],'--')

plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")

plt.title("ROC Curve")

plt.legend()

plt.show()


# ============================================
# 11. CHỦ ĐỀ NÂNG CAO
# FEATURE IMPORTANCE
# ============================================

print("\n===== FEATURE IMPORTANCE =====")

importance = pd.Series(
    rf.feature_importances_,
    index=X.columns
)

importance = importance.sort_values(ascending=False)

print(importance)

plt.figure(figsize=(8,6))
importance.plot(kind="bar")
plt.title("Mức độ quan trọng của các biến")
plt.show()