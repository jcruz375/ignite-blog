/* eslint-disable prettier/prettier */
/* eslint-disable react/no-danger */
/* eslint-disable no-return-assign */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiUser, FiWatch } from "react-icons/fi";
import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';
import styles from './post.module.scss';
import commonStyles from '../../styles/common.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

type ContentData = {
  heading: string;
  body: {
    text: string;
  }[];
};

interface PostProps {
  post: Post;
  navigation: {
    prevPost: {
      data: {
        title: string;
      }
      uid: string;
    }[];
    nextPost: {
      data: {
        title: string;
      }
      uid: string;
    }[];
  }
}

export default function Post({ post, navigation }: PostProps) {
  const router = useRouter();
  if (router.isFallback) {
    return <h1>Carregando...</h1>
  };

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));
    return total;
  }, 0);

  const readTime = Math.ceil(totalWords / 200);

  const formatedDate = format(
    new Date(post.first_publication_date),
    "dd MMM yyyy",
    {
      locale: ptBR,
    },
  );

  const formatedEditedDate = format(
    new Date(post.last_publication_date),
    " 'editado em ' dd MMM yyyy 'as' p",
    {
      locale: ptBR,
    },
  );

  return (
    <>
      <Header />
      <img src={post.data.banner.url} alt="Ilustração do post" className={styles.banner} />
      <main className={commonStyles.container}>
        <div className={styles.post}>
          <div className={styles.postHeader}>
            <h1>{post.data.title}</h1>
            <ul>
              <li>
                <FiCalendar /> {formatedDate}
              </li>
              <li>
                <FiUser /> {post.data.author}
              </li>
              <li>
                <FiWatch /> {`${readTime} min`}
              </li>
            </ul>
            {post.last_publication_date !== post.first_publication_date
              ? (
                <span className={styles.editDate}>
                  {formatedEditedDate}
                </span>
              )
              : ''
            }
          </div>
          {post.data.content.map((content) => {
            return (
              <article
                key={content.heading}
              >
                <h2>{content.heading}</h2>
                <div
                  className={styles.postContent}
                  dangerouslySetInnerHTML={{ __html: RichText.asHtml(content.body) }}
                />
              </article>
            )
          })}
        </div>
        <hr className={styles.hr} />
        <div className={styles.navigation}>
          {navigation.prevPost?.length > 0
            ? (
              <Link href={`/post/${navigation.prevPost[0].uid}`}>
                <a>
                  {navigation.prevPost[0].data.title}
                  <span>Post anterior</span>
                </a>
              </Link>
            )
            : ''
          }

          {navigation.nextPost.length > 0
            ? (
              <Link href={`/post/${navigation.nextPost[0].uid}`}>
                <a>
                  {navigation.nextPost[0].data.title}
                  <span>Próximo post</span>
                </a>
              </Link>
            )
            : ''
          }
        </div>
      </main>
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')
  ]);

  const paths = posts.results.map((post) => {
    return {
      params: {
        slug: post.uid,
      }
    }
  })
  return {
    paths,
    fallback: true,
  }
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const prevPost = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')
  ], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.last_publication_date]'
  });

  const nextPost = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')
  ], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.last_publication_date desc]'
  });

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map((content: ContentData) => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: {
      post,
      navigation: {
        prevPost: prevPost?.results,
        nextPost: nextPost?.results,
      }
    }
  }
};
