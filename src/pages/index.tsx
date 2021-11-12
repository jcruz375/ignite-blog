/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { useState } from 'react';
import { getPrismicClient } from '../services/prismic';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [posts, setPosts] = useState<Post[]>(postsPagination.results);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);
  const [currentPage, setCurrentPage] = useState(1);

  async function handleLoadMorePosts() {
    if (currentPage !== 1 && nextPage === null) {
      return;
    };
  
    const postsResults = await fetch(`${nextPage}`).then(response =>
      response.json()
    );
  
    setNextPage(postsResults.next_page);
    setCurrentPage(postsResults.page);
  
    const newPosts = postsResults.results.map((post: Post) => {
      return {
        uid: post.uid,
        first_publication_date: format(
          new Date(post.first_publication_date),
          'd MMM y',
          { locale: ptBR }
        ),
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author,
        },
      };
    });
    setPosts([
      ...posts,
      ...newPosts,
    ]);
  };

  return (
    <div className={styles.container}>
      <img
        src="/Logo.svg"
        alt="logo"
      />

      <div className={styles.posts}>
        {posts.map(post => {
          return (
            <article key={post.uid}>
              <Link href="/">
                <a>
                  <strong>{post.data.title}</strong>
                  <p>{post.data.subtitle}</p>
                  <div className={styles.infoContainer}>
                    <span>
                      <FiCalendar /> {post.first_publication_date}
                    </span>
                    <span>
                      <FiUser /> {post.data.author}
                    </span>
                  </div>
                </a>
              </Link>
            </article>
          )
        })}
      </div>

      <button
        type="button"
        onClick={handleLoadMorePosts}
      >
        Carregar mais posts
      </button>
    </div >
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 2,
    }
  );

  const posts = postsResponse.results.map((post) => {
    return {
      uid: post.uid,
      first_publication_date: format(
        new Date(post.first_publication_date),
        'd MMM y',
        { locale: ptBR }
      ),
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      }
    }
  });
  const postsPagination = {
    next_page: postsResponse.next_page,
    results: posts,
  };
  return {
    props: {
      postsPagination,
    },
    revalidate: 60 * 60 // 1 hour
  };
};
