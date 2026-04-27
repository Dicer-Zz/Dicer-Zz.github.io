---
title: 基于 Word2Vec 的红楼梦人物关系分析
published: 2021-05-18
description: ""
image: "/gallery/cover/hlm.png"
tags: ["word2vec", "红楼梦"]
category: "机器学习"
draft: false
---

word2vec是Google公司在2013年提出的一种词嵌入算法。使用word2vec算法对词汇进行向量化后，原来的近义词在向量空间中是邻近的，因此word2vec可以很好的保留原来词汇之间的相似性。



本文使用gensim库实现的word2vec算法，对红楼梦中的人物关系进行分析，得到了许多有趣的结论。

# 获取文本

首先我们需要获取原著的本文文件，并且需要保证文本文件足够「纯净」，可以减少文本处理的工作量。

可以通过爬虫，从http://www.purepen.com获取原始文本。

爬虫代码如下：

~~~python
import requests
import random
import time
from bs4 import BeautifulSoup

def crawler():
    '''
    爬取红楼梦
    :url
    :return
    '''
    path = 'http://www.purepen.com/hlm/'
    file = open('./data/红楼梦.txt', 'w+')
    for page in range(1, 121):
        url = path + ('000'+str(page))[-3:] + '.htm'
        print(url)
        html = requests.get(url)
        html.encoding = html.apparent_encoding
        soup = BeautifulSoup(html.text, 'lxml')
        title = soup.find(align = 'center').text
        print(title)
        content = soup.find(face = '宋体').text
        file.write(title   + '\t\n')
        file.write(content + '\t\n')
        sec = random.randint(0, 3)
        print("Sleep %d sconds." % sec)
        time.sleep(sec)

if __name__ == '__main__':
    crawler()
~~~

代码中通过sleep机制简单的避免了被反爬。

# 文本处理

首先需要使用正则表达式将所有的标点符号去掉。红楼梦属于半白话文半文言文的问题，因此其中许多词语分词系统是不能识别的，但是因为我们这次做的只是人物关系，所以只需要把所有的人名写入用户字典就可以保证所有的人名都能被准确地识别出来。

~~~python
def segment():
    start = time.time()
    content = open('./data/红楼梦.txt', 'r').read()
    trimed = re.sub(r'[^\u4e00-\u9fa5]', ' ', content)
    jieba.load_userdict('./data/dict.txt')
    result = ' '.join(jieba.cut(trimed))
    file = open('./data/cut_result.txt', 'w+')
    file.write(' '.join(result.split()))
    cost = time.time() - start
    print(f"Segment cost: {cost:.4f}")
~~~

按道理应该是要去掉停用词的，不过我不想做，偷个懒。😛

# 模型训练

使用gensim实现的word2vec算法进行向量化，因为文本不是很大，所以向量长度我选择的200，window大小选择的3。

~~~python
def train_model():
    start = time.time()
    sentencePath = './data/cut_result.txt'
    modelPath = './data/hlm_model'
    sentence = word2vec.LineSentence(sentencePath)
    model = word2vec.Word2Vec(sentence, vector_size=200, window=3)
    model.save(modelPath)
    cost = time.time() - start
    print(f'Word2Vec model training cost: {cost:.4f}')
~~~

训练起来还是很快的，大概一秒钟就好了。

# PCA降维

因为原始的向量长度太大，所以我们可以先用PCA（主成分分析）将向量降到二维，然后在坐标系中画出来。

~~~python
from gensim.models import word2vec
from sklearn.decomposition import PCA
from matplotlib import pyplot

pyplot.rcParams['font.sans-serif'] = ['Arial Unicode MS']

model = word2vec.Word2Vec.load('./data/hlm_model')

allNames = [x.strip('\n') for x in open('./data/name.txt', 'r').readlines()]
X, names = [], []
for name in allNames:
    try:
        X.append(model.wv[name])
        names.append(name)
    except:
        print("missed name: ", name)

pca = PCA(n_components=2)
result = pca.fit_transform(X)

pyplot.scatter(result[:, 0], result[:, 1])
for i, name in enumerate(names):
	pyplot.annotate(name, xy=(result[i, 0], result[i, 1]))
# pyplot.show()
pyplot.savefig('./data/relation.png', transparent=True)
~~~

因为word2vec会忽略掉频次比较小的词语，所以我们在获取词向量时需要进行异常捕捉。

让我们看一下效果吧！

![整体图片](/gallery/others/hlm-all.png)

因为名字有点多，整体看起来有点拥挤。我们把焦点放在又下角，可以看到宝黛钗三个人都在，我们放大一下。

![右下角局部](/gallery/others/hlm-part.png)

我们可以看到宝玉和黛玉紧紧挨着一起，宝黛一生吹好吧！

# 最相似分析

word2vec中提供了几个有趣的方法，我们可以用这些方法进一步分析一下人物关系。

代码如下：

~~~python
from gensim.models import word2vec

def analyse():
    model = word2vec.Word2Vec.load('./data/hlm_model')
    print('Nearest 宝玉:',model.wv.most_similar(['宝玉']))
    print('Nearest 黛玉:',model.wv.most_similar(['黛玉']))
    print('Nearest 宝钗:',model.wv.most_similar(['宝钗']))
    print('Nearest 晴雯:',model.wv.most_similar(['晴雯']))
    print('Nearest 袭人:',model.wv.most_similar(['袭人']))
    print('Nearest 贾母:',model.wv.most_similar(['贾母']))

    print(model.wv.doesnt_match(u"贾宝玉 薛宝钗 林黛玉 史湘云".split()))
    print(model.wv.doesnt_match(u"黛玉 元春 探春 迎春 惜春".split()))
    print(model.wv.doesnt_match(u"贾琏 贾政 贾赦 贾敬".split()))

    print(model.wv.similarity('贾宝玉','林黛玉'))
    print(model.wv.similarity('林黛玉','薛宝钗'))
    print(model.wv.similarity('晴雯', '袭人'))
    
    print(model.wv.similarity('林黛玉','薛宝钗'))
    print(model.wv.similarity('林黛玉','宝钗'))
    print(model.wv.similarity('黛玉','薛宝钗'))
    print(model.wv.similarity('黛玉','宝钗'))

    who = model.wv['宝玉'] - model.wv['宝钗'] + model.wv['黛玉']
    print(model.wv.most_similar(positive=[who]))
    who = model.wv['宝玉'] - model.wv['黛玉'] + model.wv['宝钗']
    print(model.wv.most_similar(positive=[who]))
    
if __name__ == '__main__':
    analyse()
~~~

结果如下：

~~~tex
Nearest 宝玉: [('黛玉', 0.9654377102851868), ('袭人', 0.9432756304740906), ('贾琏', 0.9404013156890869), ('紫鹃', 0.9312815070152283), ('晴雯', 0.9278832674026489), ('鸳鸯', 0.9248123168945312), ('湘云', 0.9108842015266418), ('凤姐', 0.9095652103424072), ('宝钗', 0.9087227582931519), ('薛姨妈', 0.9083631634712219)]
Nearest 黛玉: [('宝玉', 0.9654375910758972), ('宝钗', 0.9516232013702393), ('湘云', 0.9490573406219482), ('贾琏', 0.9195422530174255), ('喜不自胜', 0.9156811237335205), ('晴雯', 0.9114517569541931), ('雨村', 0.9069087505340576), ('鸳鸯', 0.9047612547874451), ('紫鹃', 0.9041048884391785), ('杜撰', 0.9008530974388123)]
Nearest 宝钗: [('探春', 0.958204448223114), ('湘云', 0.9580698609352112), ('黛玉', 0.9516231417655945), ('贾琏', 0.9483581185340881), ('惜春', 0.9394745826721191), ('薛姨妈', 0.9329902529716492), ('雨村', 0.9322482943534851), ('杜撰', 0.9264885783195496), ('紫鹃', 0.9231323003768921), ('喜不自胜', 0.9216738939285278)]
Nearest 晴雯: [('紫鹃', 0.9769253730773926), ('袭人', 0.9697536826133728), ('凤姐儿', 0.9683317542076111), ('香菱', 0.9670401215553284), ('鸳鸯', 0.9620832800865173), ('拍手', 0.9574575424194336), ('薛姨妈', 0.956330418586731), ('贾琏', 0.9559655785560608), ('陪笑', 0.9534842371940613), ('湘云', 0.9519651532173157)]
Nearest 袭人: [('紫鹃', 0.9749440550804138), ('晴雯', 0.9697537422180176), ('凤姐儿', 0.9651725888252258), ('鸳鸯', 0.9604008793830872), ('平儿', 0.9592967629432678), ('凤姐', 0.9534151554107666), ('贾琏', 0.9518244862556458), ('薛姨妈', 0.9457788467407227), ('宝玉', 0.9432753920555115), ('香菱', 0.9285346269607544)]
Nearest 贾母: [('王夫人', 0.9712321162223816), ('尤氏', 0.9515039324760437), ('贾珍', 0.9488133192062378), ('贾琏', 0.9456284046173096), ('薛姨妈', 0.937038779258728), ('凤姐', 0.9299778938293457), ('鸳鸯', 0.9244546890258789), ('邢夫人', 0.9219790101051331), ('贾蓉', 0.9125443696975708), ('雪雁', 0.9032955765724182)]
史湘云
元春
贾敬
0.9830096
0.9892198
0.96975374
0.9892198
0.6931182
0.64615595
0.95162314
[('宝玉', 0.9627019166946411), ('黛玉', 0.9240608215332031), ('袭人', 0.8599908351898193), ('晴雯', 0.8383870720863342), ('紫鹃', 0.8329888582229614), ('贾琏', 0.8326756954193115), ('鸳鸯', 0.829352080821991), ('湘云', 0.8235012292861938), ('一想', 0.8234348297119141), ('香菱', 0.8150357007980347)]
[('贾琏', 0.9775873422622681), ('宝钗', 0.964641809463501), ('紫鹃', 0.958747923374176), ('薛姨妈', 0.9540018439292908), ('宝玉', 0.9533487558364868), ('袭人', 0.9529389142990112), ('鸳鸯', 0.9496896266937256), ('凤姐', 0.9492440223693848), ('晴雯', 0.9458354115486145), ('凤姐儿', 0.9457259178161621)]
~~~

从上面的结果可以看到，宝玉最相似的是黛玉，黛玉最相似的是宝玉，而宝钗最相似的是探春。

并且可以看到「宝玉」和「黛玉」的相似度比「贾宝玉」和「黛玉」的相似度更高，说明在文中前者往往是成对出现的。

另外，我们还得到了两个有趣的式子：
$$
宝玉 - 宝钗 + 黛玉 \approx 宝玉
$$

$$
宝玉 - 黛玉 + 宝钗 \approx 贾琏
$$



很有意思😂

