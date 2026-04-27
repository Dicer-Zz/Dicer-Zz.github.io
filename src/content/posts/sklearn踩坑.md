---
title: sklearn 踩坑
published: 2021-05-05
description: ""
image: "/gallery/cover/sklearn.png"
tags: ["sklearn"]
category: "NLP"
draft: false
---

这几天在做毕业设计，想做一个微博的情感分析，想着实现两种方式，一是朴素贝叶斯，二是用LSTM。

在做朴素贝叶斯的时候，据网上看到的一些文章说，训练的速度应该是很快的。但是我的训练速度却很慢，分析了一下发现是文本分词、清洗占去了大量的时间。我的语料大概12w行，20MB左右。文本处理需要一分多钟，而朴素贝叶斯的训练时间只需要一秒钟左右。

于是想把文本处理的结果，保存起来，下次直接使用，就不需要每次都多等一分钟了。



# 持久化

原始文本的格式（csv格式）：

~~~
label,review
1,更博了，爆照了，帅的呀，就是越来越爱你！生快傻缺[爱你][爱你][爱你]
1,@张晓鹏jonathan 土耳其的事要认真对待[哈哈]，否则直接开除。@丁丁看世界 很是细心，酒店都全部OK啦。
1,姑娘都羡慕你呢…还有招财猫高兴……//@爱在蔓延-JC:[哈哈]小学徒一枚，等着明天见您呢//@李欣芸SharonLee:大佬范儿[书呆子]
1,美~~~~~[爱你]
~~~

处理后的文件（csv格式）：

~~~
label,review
1,更博 爆照 帅 的 呀 越来越 爱 生快 傻 缺 [爱你] [爱你] [爱你]
1,土耳其 的 事要 认真对待 [哈哈] 直接 开除 是 细心 酒店 都 全部
1,姑娘 都 羡慕 呢 招财猫 高兴 [哈哈] 小 学徒 一枚 等 着 明天 见 呢 大佬 范儿 [书呆子]
1,美 [爱你]
~~~

处理文件的脚本：

~~~python
import random
import re

import jieba
import pandas as pd


def trim(text):
    """
    带有语料清洗功能的分词函数, 包含数据预处理, 可以根据自己的需求重载
    使用re保证了一些本来可能会分开的表情图标不分开
    return: [str]
    """
    text = re.sub("\{%.+?%\}", " ", text)           # 去除 {%xxx%} (地理定位, 微博话题等)
    # text = re.sub("@.+?( |$)", " ", text)           # 去除 @xxx (用户名)
    text = re.sub("@.+?( |:)", " ", text)           # 去除 @xxx (用户名)
    text = re.sub("【.+?】", " ", text)              # 去除 【xx】 (里面的内容通常都不是用户自己写的)
    text = re.sub("[a-zA-Z0-9]", " ", text)         # 去除字母和数字
    icons = re.findall("\[.+?\]", text)             # 提取出所有表情图标
    text = re.sub("\[.+?\]", "IconMark", text)      # 将文本中的图标替换为`IconMark`

    tokens = []
    # for k, w in enumerate(jieba.lcut(text)):
    jieba.load_userdict('./data/user_dict.txt')
    for w in jieba.cut(text):
        w = w.strip()
        if "IconMark" in w:                         # 将IconMark替换为原图标
            for i in range(w.count("IconMark")):
                tokens.append(icons.pop(0))
        elif w and w != '\u200b' and w.isalpha():   # 只保留有效文本
            tokens.append(w)
    return tokens


def load_corpus(csvFilePath, stopwordPath):
    """
    加载语料库，并进行分词，数据清洗，去除停用词
    """
    # 数据读取
    df = pd.read_csv(csvFilePath)
    stopword = load_stopword(stopwordPath)
    labels, reviews = df['label'].to_list(), df['review'].to_list()
    trimedReviews = []
    for review in reviews:
        # 数据清洗
        trimedReview = trim(review)
        # 去除停用词
        finalReview = []
        for word in trimedReview:
            if word not in stopword:
                finalReview.append(word)
        trimedReviews.append(finalReview)
    return labels, trimedReviews

def load_reviews(csvFilePath):
    df = pd.read_csv(csvFilePath)
    return df['label'], df['review']

def load_stopword(filePath):
    """
    加载停用词
    """
    with open(filePath, encoding='UTF-8') as words:
        stopword = [word.strip() for word in words]
    return stopword


def data_suffle(labels, reviews):
    """
    打乱数据
    """
    join = list(zip(labels, reviews))
    random.shuffle(join)
    labels, reviews = zip(*join)
    return list(labels), list(reviews)

def pre_trim(csvFilePath, stopwordPath):
    """
    预处理csv文本，并持久化
    """
    df = pd.read_csv(csvFilePath)
    _, reviews = load_corpus(csvFilePath, stopwordPath)
    for index in range(len(reviews)):
        reviews[index] = ' '.join(reviews[index])
    df['review'] = reviews
    df.to_csv(csvFilePath[:-4] + 'Trimed.csv', index=False)

if __name__ == '__main__':
    csvFilePath = '../../corpus/100k/all.csv'
    stopwordPath = './data/stopword.txt'
    pre_trim(csvFilePath, stopwordPath)
~~~

# 读取文件

## 读取文件并分割数据集

~~~python
import time
import pickle
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer, TfidfTransformer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from utils import load_reviews, data_suffle

# stopwordPath = './data/stopword.txt'
# userDictPath = './data/user_dict.txt'
csvFilePath = '../../corpus/100k/allTrimed.csv'
modelPath = './data/bayes.model'

# 载入自定义字典
# jieba.load_userdict(userDictPath)

time_start = time.time()

labels, reviews = load_reviews(csvFilePath)
labels, reviews = data_suffle(labels, reviews)

# 1/4 分割数据集
n = len(labels) // 5
labels_train, reviews_train = labels[n:], reviews[n:]
labels_test, reviews_test = labels[:n], reviews[:n]

print(f'Load Corpus Cost {time.time() - time_start:.4f} Sec')
~~~

## 训练模型

~~~python
time_start = time.time()

vectorizer = CountVectorizer(max_df=0.8, min_df=5)
# ⚠️坑点
vec_train = vectorizer.fit_transform([np.str_(review) for review in reviews_train])
clf = MultinomialNB().fit(vec_train, labels_train)

print(f'Train Model Cost {time.time() - time_start:.4f} Sec')
~~~

这个地方就是我遇到的问题，如果不将`reviews`全部转为`np.string`的话，会报`ValueError: np.nan is an invalid document, expected byte or unicode string.`错误，但是根据sklearn的文档，似乎并没有说不能传入`str`类型。

## 测试模型

~~~python
vec_test = vectorizer.transform([np.str_(review) for review in reviews_test])
pred = clf.predict(vec_test)
from sklearn import metrics
print(metrics.classification_report(labels_test, pred))
print("准确率:", metrics.accuracy_score(labels_test, pred))
~~~

预测的准确率还不错，能达到85%以上。